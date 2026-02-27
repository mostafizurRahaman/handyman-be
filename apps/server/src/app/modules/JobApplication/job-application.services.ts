import {
  AuthRoles,
  ChargeType,
  Job,
  JobApplication,
  JobApplicationStatus,
  JobStatus,
  Payment,
  PaymentStatus,
  User,
  type IJobDocument,
  type IPayment,
  type IUser,
} from 'packages/db/src'
import type {
  TCreateJobApplication,
  TGetJobApplicationQuery,
  TUpdateJobApplication,
} from './job-application.validation'
import { addTime, AppError } from '@repo/shared'
import httpStatus from 'http-status'
import { Types, type PipelineStage } from 'mongoose'
import { logger } from '@app/libs/logger'
import { calculateMarketplaceBreakdown } from '@app/libs/calculate-marketplace-breakdown'
import axios from 'axios'
import configs from '@app/configs'

// 1. Apply into a job:
const createJobApplication = async (userInfo: IUser, payload: TCreateJobApplication) => {
  const { job, proposed_price, message } = payload

  // 1. Check is user exits ?:
  const user = await User.findById(userInfo?._id)
  if (!user || user.role !== AuthRoles.PROVIDER) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't exists!`)
  }

  // 2. Check is job exists?:
  const existingJob = await Job.findById(job)
  if (!existingJob) {
    throw new AppError(httpStatus.NOT_FOUND, `Job doesn't exists`)
  }

  // 3. Check job status:
  if (existingJob.status !== JobStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Job status must be PENDING to apply. Current status: ${existingJob.status}`
    )
  }

  // 4. Already has application ?
  const alreadyHasApplication = await JobApplication.exists({
    job: existingJob?._id,
    provider: user?._id,
  })
  if (alreadyHasApplication) {
    throw new AppError(httpStatus.BAD_REQUEST, `You have already applied!`)
  }

  // 5. Check pricing shouldn't be negative :
  if (proposed_price <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, `Proposed pricing should be positive number!`)
  }

  // 6. place the application:
  const applicationPayload = {
    job: existingJob?._id,
    provider: user?._id,
    message: message as string,
    proposed_price,
  }

  const application = await JobApplication.create(applicationPayload)

  return application
}

// 2. Update the application:
const updateTheApplications = async (
  id: string,
  userInfo: IUser,
  payload: TUpdateJobApplication
) => {
  // 1. Check application exists
  const jobApplication = await JobApplication.findById(id)
  if (!jobApplication) {
    throw new AppError(httpStatus.BAD_REQUEST, `Job application doesn't exist!`)
  }

  // 2. Check this application belongs to this provider
  if (jobApplication.provider.toString() !== userInfo._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `This application doesn't belong to this user!`)
  }

  // 3. Check application status (REJECTED / ACCEPTED can't be updated)
  if (
    [JobApplicationStatus.REJECTED, JobApplicationStatus.ACCEPTED].includes(
      jobApplication?.status as 'accepted' | 'rejected'
    )
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You can't update this application at its current status : "${jobApplication.status}"!`
    )
  }

  // 4. Check job exists
  const job = await Job.findById(jobApplication.job)
  if (!job) {
    throw new AppError(httpStatus.BAD_REQUEST, `Job doesn't exist!`)
  }

  // 5. Check job status must be PENDING
  if (job.status !== 'pending') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Job status must be PENDING to update. Current status: ${job.status}`
    )
  }

  // 6. Validate proposed price
  if (payload.proposed_price !== undefined && payload.proposed_price <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, `Proposed pricing should be a positive number!`)
  }

  // 7. Update the application
  const application = await JobApplication.findOneAndUpdate({ _id: id }, payload, { new: true })

  return application
}

// 3. Get all job application:
const getAllJobApplications = async (query: TGetJobApplicationQuery) => {
  const {
    job,
    provider,
    status,
    searchTerm,
    fromDate,
    limit = 10,
    page = 1,
    toDate,
    sortBy = 'createdAt',
    sortOrder = 'desc',
  } = query

  const skip = (Number(page) - 1) * Number(limit)

  logger.debug({ skip })

  const basePipeline: PipelineStage[] = []

  // 1. Filter part:
  const filtersStage: PipelineStage = {
    $match: {},
  }

  if (query.job) {
    filtersStage.$match.job = new Types.ObjectId(job)
  }
  if (query.provider) {
    filtersStage.$match.provider = new Types.ObjectId(provider)
  }
  if (query.status) {
    filtersStage.$match.status = status
  }

  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) {
      dateFilter.$gte = new Date(fromDate)
    }
    if (toDate) {
      dateFilter.$lte = new Date(toDate)
    }
    filtersStage.$match.createdAt = dateFilter
  }

  basePipeline.push(filtersStage)

  //   //   2. Lookup Stage For Job:
  //   pipeline.push({
  //     $lookup: {
  //       from: 'jobs',
  //       localField: 'job',
  //       foreignField: '_id',
  //       as: 'jobDetails',
  //       pipeline: [
  //         {
  //           $project: {
  //             title: 1,
  //             description: 1,
  //             price: 1,
  //             location: 1,
  //             images: 1,
  //             status: 1,
  //             customer: 1,
  //           },
  //         },
  //       ],
  //     },
  //   })

  // 3. Lookup Stage For Provider  :
  basePipeline.push({
    $lookup: {
      from: 'users',
      localField: 'provider',
      foreignField: '_id',
      as: 'providerDetails',
      pipeline: [
        {
          $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'provider',
            as: 'reviews',
          },
        },

        {
          $addFields: {
            averageRatings: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: '$reviews',
                    },
                    0,
                  ],
                },
                {
                  $round: [
                    {
                      $avg: '$reviews.star',
                    },
                    1,
                  ],
                },
                0,
              ],
            },
            totalRatings: {
              $size: '$reviews',
            },
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            profileImage: 1,
            status: 1,
            totalRatings: 1,
            averageRatings: 1,
          },
        },
      ],
    },
  })

  basePipeline.push({
    $unwind: { path: '$providerDetails', preserveNullAndEmptyArrays: true },
  })

  basePipeline.push({
    $project: {
      _id: 1,
      job: 1,
      provider: 1,
      proposed_price: 1,
      status: 1,
      updatedAt: 1,
      createdAt: 1,
      providerName: '$providerDetails.name',
      providerEmail: '$providerDetails.email',
      providerStatus: '$providerDetails.status',
      averageRatings: '$providerDetails.averageRatings',
      totalRatings: '$providerDetails.totalRatings',
    },
  })

  if (searchTerm) {
    const searchableFields = ['providerName', 'providerEmail']

    basePipeline.push({
      $match: {
        $or: searchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  if (sortBy || sortOrder) {
    basePipeline.push({
      $sort: {
        [sortBy]: sortOrder?.toLowerCase() === 'asc' ? 1 : -1,
      },
    })
  }

  // Application pipeline :

  const applications = await JobApplication.aggregate([
    ...basePipeline,
    {
      $facet: {
        data: [
          {
            $skip: skip,
          },
          {
            $limit: limit,
          },
        ],
        count: [
          {
            $count: 'total',
          },
        ],
      },
    },
  ])

  const data = applications?.[0]?.data
  const total = applications?.[0]?.count?.[0]?.total || 0
  const totalPages = Math.ceil(total / Number(limit))

  return {
    data: data,
    meta: {
      limit: Number(limit),
      page: Number(page),
      total,
      totalPages,
    },
  }
}

// 4. Accept the jobs:
const acceptJobApplicationById = async (user: IUser, id: string) => {
  // Is Job application exists? :
  const jobApplication = await JobApplication.findById(id).populate<{ job: IJobDocument }>('job')
  if (!jobApplication) {
    throw new AppError(httpStatus.NOT_FOUND, `Job application doesn't exists!`)
  }

  //  Check is that job exists?:
  const job = await Job.findById(jobApplication.job?._id)
  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, `Job doesn't exists!`)
  }

  // Check is job pending?:
  if (job.status !== JobStatus.PENDING) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Only Pending job can assigned to a provider! Current Status "${job.status}"`
    )
  }

  // Check is job application is pending ?
  if (jobApplication.status !== JobApplicationStatus.PENDING) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      `Only Pending job application can be accept! Current Status "${jobApplication.status}"`
    )
  }

  // Check Job creator and assigner are same person?:
  if (job.customer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `This job is not belongs to your account!`)
  }

  // Calculate Fees:
  const pricing = calculateMarketplaceBreakdown(jobApplication.proposed_price)

  logger.info('AMOUNT BREAKING', {
    amount: pricing.customerPays * 100,
    email: user.email,
    currency: 'NGN',
    callback_url: configs.payStackConfig.successUrl,
    metadata: {
      type: ChargeType.PAYMENT,
      ...pricing,
      job: job?._id,
      customer: job?.customer,
      provider: jobApplication?.provider,
    },
  })

  // Check Existing payment record:
  const payment = await Payment.findOne({
    job: job?._id,
    customer: job?.customer,
  }).select('+accessCode')

  if (
    payment &&
    [PaymentStatus.HELD, PaymentStatus.RELEASED, PaymentStatus.REFUNDED].includes(
      payment.status as 'HELD' | 'RELEASED' | 'REFUNDED'
    )
  ) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Payment have been completed! Payment status: ${payment.status}`
    )
  }

  if (
    payment &&
    payment.status === PaymentStatus.INITIALIZED &&
    new Date(payment.expiresAt).getTime() >= Date.now()
  ) {
    return {
      checkOutUrl: `https://checkout.paystack.com/${payment.accessCode}`,
      reference: payment?.reference,
      access_code: payment?.accessCode,
    }
  }

  /**
   * IF FAILED : RE INIT PAYMENT LINK
   * IF INITIALIZED && EXPIRED RE INIT
   *  */
  if (
    payment &&
    (payment.status === PaymentStatus.FAILED ||
      (payment.status === PaymentStatus.INITIALIZED &&
        new Date(payment.expiresAt).getTime() < Date.now()))
  ) {
    const { data } = await axios.post(
      `https://api.paystack.co/transaction/initialize`,
      {
        amount: pricing.customerPays * 100,
        email: user.email,
        currency: 'NGN',
        callback_url: configs.payStackConfig.successUrl,
        metadata: {
          type: ChargeType.PAYMENT,
          ...pricing,
          job: job?._id,
          customer: job?.customer,
          provider: jobApplication?.provider,
          jobApplication: jobApplication?._id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${configs?.payStackConfig?.secretKey}`,
        },
      }
    )

    if (data.status) {
      payment.reference = data.data.reference
      payment.lastReference = data.data.reference
      payment.accessCode = data.data.access_code
      payment.status = PaymentStatus.INITIALIZED
      payment.attemptCount = payment.attemptCount + 1
      payment.expiresAt = addTime(3, 'minutes')
      await payment.save()
    }

    return {
      checkOutUrl: data?.data?.authorization_url,
      reference: data?.data?.reference,
      access_code: data?.data?.access_code,
    }
  }

  //  Iniitialize the payment:
  try {
    const { data } = await axios.post(
      `https://api.paystack.co/transaction/initialize`,
      {
        amount: pricing.customerPays * 100,
        email: user.email,
        currency: 'NGN',
        callback_url: configs.payStackConfig.successUrl,
        metadata: {
          type: ChargeType.PAYMENT,
          ...pricing,
          job: job?._id,
          customer: job?.customer,
          provider: jobApplication?.provider,
          jobApplication: jobApplication?._id,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${configs?.payStackConfig?.secretKey}`,
        },
      }
    )

    if (data.status) {
      const paymentPayload: IPayment = {
        job: job?._id,
        customer: job.customer,
        amount: pricing.customerPays,
        currency: 'NGN',
        gateway: 'paystack',
        reference: data?.data.reference,
        lastReference: data?.data.reference,
        status: PaymentStatus.INITIALIZED,
        accessCode: data.data.access_code,
        agreedPrice: pricing.agreedPrice,
        customerPays: pricing.customerPays,
        gatewayFee: pricing.gatewayFee,
        gstOnPlatformFee: pricing.gstOnPlatformFee,
        providerReceives: pricing.providerReceives,
        platformFee: pricing.platformFee,
        attemptCount: 1,
        expiresAt: addTime(3, 'minutes'),
      }
      await Payment.create(paymentPayload)
      return {
        checkOutUrl: data?.data?.authorization_url,
        reference: data?.data?.reference,
        access_code: data?.data?.access_code,
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    const msg = error?.response?.data?.message || 'Payment initialization failed!'
    throw new AppError(httpStatus.BAD_REQUEST, msg)
  }
}

// 5. Decline the job:
const declineJobApplicationById = async (user: IUser, id: string) => {
  const jobApplication = await JobApplication.findById(id).populate<{ job: IJobDocument }>('job')

  if (!jobApplication) {
    throw new AppError(httpStatus.NOT_FOUND, `Job application doesn't exist`)
  }

  if (!jobApplication.job) {
    throw new AppError(httpStatus.NOT_FOUND, `Job doesn't exist`)
  }

  const job = jobApplication.job

  if (job.customer.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `Unauthorized`)
  }

  if (job.status !== JobStatus.PENDING) {
    throw new AppError(httpStatus.BAD_REQUEST, `Only pending job applications can be rejected`)
  }

  if (jobApplication.status !== JobApplicationStatus.PENDING) {
    throw new AppError(httpStatus.BAD_REQUEST, `Application already processed`)
  }

  jobApplication.status = JobApplicationStatus.REJECTED

  await jobApplication.save()

  return jobApplication
}

export const JobApplicationServices = {
  createJobApplication,
  updateTheApplications,
  getAllJobApplications,
  acceptJobApplicationById,
  declineJobApplicationById,
}
