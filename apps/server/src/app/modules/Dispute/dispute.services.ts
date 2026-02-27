import {
  AuthRoles,
  Dispute,
  DisputeStatus,
  EscrowModel,
  EscrowStatus,
  Job,
  JobStatus,
  JobStatusHistory,
  Payment,
  PaymentStatus,
  TransactionLedger,
  TransactionLedgerType,
  Wallet,
  type IUser,
} from '@repo/db'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import { uploadMultipleFileToS3 } from '@repo/media-hub'
import type { TGetAllDisputeQueryType, TResolveDisputePayloadType } from './dispute.validations'
import mongoose, { Types, type PipelineStage } from 'mongoose'
import axios from 'axios'
import configs from '@app/configs'

const submitDisputeEvidence = async (provider: IUser, id: string, files: Express.Multer.File[]) => {
  const dispute = await Dispute.findById(id)
  if (!dispute) throw new AppError(httpStatus.NOT_FOUND, 'Dispute not found')

  if (dispute.provider.toString() !== provider._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not the provider for this dispute')
  }

  if (dispute.status !== DisputeStatus.OPEN) {
    throw new AppError(httpStatus.BAD_REQUEST, `Dispute is already ${dispute.status}`)
  }

  if (!files || files.length === 0) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please upload at least one evidence image')
  }

  if (
    dispute.providerEvidence &&
    Array.isArray(dispute?.providerEvidence) &&
    dispute?.providerEvidence?.length + files?.length > 10
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You can't submit more then 10 evidence! You have already submitted ${dispute.providerEvidence?.length}`
    )
  }

  const uploadedFiles = await uploadMultipleFileToS3(files, 'disputes')
  const attachmentUrls = uploadedFiles.map((f) => f.url)

  dispute.providerEvidence = [...(dispute.providerEvidence || []), ...attachmentUrls]
  await dispute.save()

  return dispute
}

const resolveDispute = async (adminId: string, id: string, payload: TResolveDisputePayloadType) => {
  const { decision, resolutionNote } = payload

  // 1. Fetch required entities
  const dispute = await Dispute.findById(id)
  if (!dispute) throw new AppError(httpStatus.NOT_FOUND, 'Dispute not found')

  if (dispute.status !== DisputeStatus.OPEN) {
    throw new AppError(httpStatus.BAD_REQUEST, `Dispute is already ${dispute.status}`)
  }

  const job = await Job.findById(dispute.job)
  if (!job) throw new AppError(httpStatus.NOT_FOUND, 'Job not found')

  const escrow = await EscrowModel.findOne({ job: job._id, status: EscrowStatus.FROZEN })
  if (!escrow) throw new AppError(httpStatus.NOT_FOUND, 'Frozen Escrow not found for this job')

  const payment = await Payment.findOne({ job: job._id })
  if (!payment) throw new AppError(httpStatus.NOT_FOUND, 'Payment not found for this job')

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const providerReceivesInKobo = escrow.providerReceives * 100

    if (decision === 'REFUND_CUSTOMER') {
      // A. Refund via Paystack
      const refundRes = await axios.post(
        'https://api.paystack.co/refund',
        { transaction: payment.reference }, // Complete refund
        {
          headers: {
            Authorization: `Bearer ${configs.payStackConfig.secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      )

      if (!refundRes.data.status) throw new Error('Paystack refund failed initialization')

      // Mark payment as pending refund (waiting for webhook to confirm)
      payment.status = PaymentStatus.REFUND_PENDING
      await payment.save({ session })

      // B. Remove pending funds from the provider's wallet (they lost the dispute)
      await Wallet.findOneAndUpdate(
        { user: new Types.ObjectId(job.assignedTo) },
        {
          $inc: {
            pendingBalance: -providerReceivesInKobo,
          },
        },
        { session, upsert: true }
      )

      // C. Create Ledger Entry for Customer: REFUND
      await TransactionLedger.create(
        [
          {
            user: job.customer,
            job: job._id,
            type: TransactionLedgerType.REFUND,
            amount: payment.customerPays, // Full amount customer paid
            reason: `Dispute resolved in favor of customer. Refund initiated.`,
            reference: payment.reference,
            details: { resolutionNote },
          },
        ],
        { session }
      )
    } else if (decision === 'RELEASE_TO_PROVIDER') {
      // A. Release funds to provider's wallet (Move pending -> balance)
      await Wallet.findOneAndUpdate(
        { user: new Types.ObjectId(job.assignedTo) },
        {
          $inc: {
            pendingBalance: -providerReceivesInKobo,
            balance: providerReceivesInKobo,
            lifetimeIncome: providerReceivesInKobo,
          },
        },
        { session, upsert: true }
      )

      payment.status = PaymentStatus.RELEASED
      await payment.save({ session })

      // B. Create Ledger Entry for Provider: CREDIT
      await TransactionLedger.create(
        [
          {
            user: new Types.ObjectId(job.assignedTo),
            job: job._id,
            type: TransactionLedgerType.CREDIT,
            amount: escrow.providerReceives,
            reason: `Dispute resolved in favor of provider. Funds Released.`,
            reference: payment.reference,
            details: { resolutionNote },
          },
        ],
        { session }
      )
    }

    // Update global entities
    escrow.status = EscrowStatus.RELEASED
    escrow.releasedAt = new Date()
    await escrow.save({ session })

    job.status = JobStatus.CLOSED
    job.closedAt = new Date()
    await job.save({ session })

    JobStatusHistory.create([
      {
        job: job?._id,
        oldStatus: JobStatus.DISPUTE,
        newStatus: JobStatus.CLOSED,
        changedByRole: AuthRoles.ADMIN,
        changedBy: adminId,
        reason: `Job has been paid by the customer and assigned to the provider`,
      },
    ])

    dispute.status = DisputeStatus.RESOLVED
    dispute.resolvedBy = adminId as any
    dispute.resolutionNote = resolutionNote
    await dispute.save({ session })

    await session.commitTransaction()
    return dispute
  } catch (error: any) {
    await session.abortTransaction()
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, error.message || 'Error resolving dispute')
  } finally {
    session.endSession()
  }
}

const getDisputeById = async (id: string) => {
  const dispute = await Dispute.findById(id).populate('job customer provider')
  if (!dispute) {
    throw new AppError(httpStatus.NOT_FOUND, 'Dispute not found')
  }
  return dispute
}

const getAllDisputes = async (query: TGetAllDisputeQueryType) => {
  const {
    page = 1,
    limit = 10,
    fromDate,
    toDate,
    searchTerm,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
  } = query

  const numericPage = Number(page)
  const numericLimit = Number(limit)
  const skip = (numericPage - 1) * numericLimit

  const searchableFields = [
    'providerName',
    'providerEmail',
    'customerName',
    'customerEmail',
    'jobTitle',
    'jobDescription',
  ]

  /* ---------------------- Dynamic Filters ---------------------- */

  const matchStage: Record<string, any> = {}

  // Status filter
  if (status) {
    matchStage.status = status
  }

  // Date range filter
  if (fromDate || toDate) {
    matchStage.createdAt = {}
    if (fromDate) {
      matchStage.createdAt.$gte = new Date(fromDate)
    }
    if (toDate) {
      matchStage.createdAt.$lte = new Date(toDate)
    }
  }

  const pipeline: PipelineStage[] = [
    { $match: matchStage },

    /* ---------------------- Payment Lookup ---------------------- */
    {
      $lookup: {
        from: 'payments',
        let: {
          jobId: '$job',
          customerId: '$customer',
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [{ $eq: ['$$jobId', '$job'] }, { $eq: ['$$customerId', '$customer'] }],
              },
            },
          },
        ],
        as: 'payment',
      },
    },
    {
      $unwind: {
        path: '$payment',
        preserveNullAndEmptyArrays: true,
      },
    },

    /* ---------------------- Job Lookup ---------------------- */
    {
      $lookup: {
        from: 'jobs',
        localField: 'job',
        foreignField: '_id',
        as: 'job',
      },
    },
    { $unwind: '$job' },

    /* ---------------------- Customer Lookup ---------------------- */
    {
      $lookup: {
        from: 'users',
        localField: 'customer',
        foreignField: '_id',
        as: 'customer',
      },
    },
    { $unwind: '$customer' },

    /* ---------------------- Provider Lookup ---------------------- */
    {
      $lookup: {
        from: 'users',
        localField: 'provider',
        foreignField: '_id',
        as: 'provider',
      },
    },
    { $unwind: '$provider' },

    /* ---------------------- Project (Flatten) ---------------------- */
    {
      $project: {
        _id: 1,
        reason: 1,
        customerEvidence: 1,
        providerEvidence: 1,
        status: 1,
        resolvedBy: 1,
        resolutionNote: 1,
        createdAt: 1,
        updatedAt: 1,

        // Job
        jobId: '$job._id',
        jobTitle: '$job.title',
        jobDescription: '$job.description',

        // Customer
        customerId: '$customer._id',
        customerName: '$customer.name',
        customerEmail: '$customer.email',
        customerPhoneNumber: '$customer.phoneNumber',

        // Provider
        providerId: '$provider._id',
        providerName: '$provider.name',
        providerEmail: '$provider.email',
        providerPhoneNumber: '$provider.phoneNumber',

        // Payment Breakdown
        amount: '$payment.amount',
        agreedPrice: '$payment.agreedPrice',
        platformFee: '$payment.platformFee',
        gstOnPlatformFee: '$payment.gstOnPlatformFee',
        providerReceives: '$payment.providerReceives',
        gatewayFee: '$payment.gatewayFee',
        customerPays: '$payment.customerPays',
      },
    },
  ]

  /* ---------------------- Search (AFTER project) ---------------------- */

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: searchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  /* ---------------------- Sorting ---------------------- */

  pipeline.push({
    $sort: {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    },
  })

  /* ---------------------- Pagination ---------------------- */

  pipeline.push({ $skip: skip })
  pipeline.push({ $limit: numericLimit })

  /* ---------------------- Execute ---------------------- */

  const data = await Dispute.aggregate(pipeline)

  /* ---------------------- Total Count (With Same Filters) ---------------------- */

  const countPipeline = [...pipeline]

  // remove skip & limit for counting
  countPipeline.splice(-2, 2)

  countPipeline.push({
    $count: 'total',
  })

  const totalResult = await Dispute.aggregate(countPipeline)
  const total = totalResult[0]?.total || 0

  return {
    data,
    meta: {
      total,
      page: numericPage,
      limit: numericLimit,
      totalPages: Math.ceil(total / numericLimit),
    },
  }
}

export const disputeServices = {
  submitDisputeEvidence,
  resolveDispute,
  getDisputeById,
  getAllDisputes,
}
