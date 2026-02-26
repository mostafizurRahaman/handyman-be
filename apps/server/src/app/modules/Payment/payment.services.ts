import { logger } from '@app/libs/logger'
import mongoose, { Types, type PipelineStage } from 'mongoose'
import {
  AuthRoles,
  Dispute,
  DisputeStatus,
  EscrowModel,
  EscrowStatus,
  Job,
  JobApplication,
  JobApplicationStatus,
  JobStatus,
  JobStatusHistory,
  Payment,
  PaymentStatus,
  Payout,
  TransactionLedger,
  TransactionLedgerType,
  Wallet,
} from 'packages/db/src'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import type { TGetAllPayments } from './payment.validations'

// 1. Payment Success :
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleJobPaymentSuccess = async (data: Record<string, any>) => {
  logger.info('🟢 INSIDE Handle Job Payments', { data })

  const { metadata, reference, amount } = data
  const {
    job,
    jobApplication,
    provider,
    customer,
    customerPays,
    gatewayFee,
    providerReceives,
    gstOnPlatformFee,
    platformFee,
    agreedPrice,
  } = metadata

  const jobId = new Types.ObjectId(job)
  const applicationId = new Types.ObjectId(jobApplication)
  const providerId = new Types.ObjectId(provider)
  const customerId = new Types.ObjectId(customer)

  // 1️⃣ Find existing payment
  const existingPayment = await Payment.findOne({ reference })
  if (!existingPayment) {
    logger.warn('❌ Payment not found for reference', { reference })
    throw new AppError(httpStatus.BAD_REQUEST, 'Payment not found for this reference')
  }

  logger.info('✅ Existing Payment found', existingPayment.toObject())

  // 2️⃣ Start Mongoose session
  const session = await mongoose.startSession()
  session.startTransaction()
  logger.info('🔹 Transaction session started')

  try {
    // 3️⃣ Update payment to HELD
    const payment = await Payment.findOneAndUpdate(
      { reference, job: jobId },
      { amount: amount / 100, status: PaymentStatus.HELD },
      { new: true, session }
    )
    logger.info('💰 Payment updated to HELD', payment?.toObject())

    const [escrowPayload] = await EscrowModel.insertMany(
      [
        {
          job: jobId,
          status: EscrowStatus.LOCKED,
          payment: payment?._id as Types.ObjectId,
          lockedAt: new Date(),
          amount: providerReceives,
          agreedPrice,
          customerPays,
          platformFee,
          gatewayFee,
          gstOnPlatformFee,
          providerReceives,
        },
      ],
      { session }
    )
    logger.info('🗄️ Escrow record created', {
      job: jobId,
      status: EscrowStatus.LOCKED,
      payment: payment?._id as Types.ObjectId,
      lockedAt: new Date(),
      amount: providerReceives,
      agreedPrice,
      customerPays,
      platformFee,
      gatewayFee,
      gstOnPlatformFee,
      providerReceives,
    })

    // 5️⃣ Update Job
    await Job.findByIdAndUpdate(
      jobId,
      {
        status: JobStatus.ACCEPTED,
        assignedTo: provider,
        agreedPrice,
        providerReceives,
      },
      { session }
    )
    logger.info('📌 Job updated to ACCEPTED', { jobId, providerId })

    // 6️⃣ Update Job Application
    await JobApplication.findByIdAndUpdate(
      applicationId,
      { status: JobApplicationStatus.ACCEPTED },
      { session }
    )
    logger.info('✅ Job application ACCEPTED', { applicationId })

    // 7️⃣ Reject other applications for this job
    await JobApplication.updateMany(
      { job: jobId, _id: { $ne: applicationId }, status: JobApplicationStatus.PENDING },
      { status: JobApplicationStatus.REJECTED },
      { session }
    )
    logger.info('🚫 Other job applications rejected', { jobId })

    // 8️⃣ Update Job History
    await JobStatusHistory.insertMany(
      [
        {
          job: jobId,
          oldStatus: JobStatus.PENDING,
          newStatus: JobStatus.ACCEPTED,
          changedByRole: AuthRoles.CUSTOMER,
          changedBy: customerId,
          reason: `Job has been paid by the customer and assigned to the provider`,
        },
      ],
      { session }
    )
    logger.info('📜 Job status history updated', { jobId })

    // 9️⃣ Create Transaction Ledger entries
    const ledgerEntries = [
      {
        user: customerId,
        job: jobId,
        type: TransactionLedgerType.DEBIT,
        reference,
        amount: amount / 100,
        reason: `Customer paid: ${customerPays}, Provider receives: ${providerReceives}`,
        details: {
          amount: providerReceives,
          agreedPrice,
          customerPays,
          platformFee,
          gatewayFee,
          gstOnPlatformFee,
        },
      },
    ]
    await TransactionLedger.insertMany(ledgerEntries, { session })
    logger.info('💳 Transaction ledger entries created', { ledgerEntries })

    // 🔟 Update provider wallet
    const updatedWallet = await Wallet.findOneAndUpdate(
      { user: providerId },
      { $inc: { pendingBalance: providerReceives * 100 } },
      { new: true, upsert: true, session }
    )
    logger.info('💼 Provider wallet updated', updatedWallet?.toObject())

    // 1️⃣1️⃣ Commit transaction
    await session.commitTransaction()
    logger.info('✅ Transaction committed successfully')

    return {
      payment: payment?.toObject(),
      escrow: escrowPayload,
      wallet: updatedWallet?.toObject(),
    }
  } catch (error) {
    logger.error('❌ Error during job payment handling', { error })
    logger.error(error)
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
    logger.info('🔹 Transaction session ended')
  }
}

// 2.  Payment Failed :
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleJobPaymentFailed = async (data: Record<string, any>) => {
  const { reference } = data
  logger.info('🔴 INSIDE Handle Job Payment Failed', { reference })

  const payment = await Payment.findOneAndUpdate(
    { reference },
    { status: PaymentStatus.FAILED },
    { new: true }
  )

  if (payment) {
    logger.info(`✅ Payment status updated to FAILED for reference: ${reference}`)
  } else {
    logger.warn(`❌ No payment found with reference: ${reference}`)
  }
}

// ==========================================
// REFUND WEBHOOK HANDLERS
// ==========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleRefundProcessed = async (data: any) => {
  const { transaction_reference } = data // Paystack refund object
  logger.info('🟢 INSIDE Handle Refund Processed', { reference: transaction_reference })

  const payment = await Payment.findOneAndUpdate(
    { reference: transaction_reference, status: PaymentStatus.REFUND_PENDING },
    { status: PaymentStatus.REFUNDED },
    { new: true }
  )

  if (payment) {
    // Note: The ledger was already updated with the 'REFUND' entry when the admin resolved the dispute.
    // We only need to finalize the payment status here.
    logger.info(
      `✅ Payment status fully updated to REFUNDED for reference: ${transaction_reference}`
    )
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleRefundFailed = async (data: any) => {
  const { transaction_reference } = data
  logger.error('🔴 INSIDE Handle Refund Failed', { reference: transaction_reference })

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // 1. Revert payment status back to HELD
    const payment = await Payment.findOneAndUpdate(
      { reference: transaction_reference, status: PaymentStatus.REFUND_PENDING },
      { status: PaymentStatus.HELD },
      { new: true, session }
    )

    if (payment) {
      // 2. Fetch related Escrow, Job, and Dispute
      const escrow = await EscrowModel.findOne({ payment: payment._id })
      const job = await Job.findById(payment.job)
      const dispute = await Dispute.findOne({ job: payment.job, status: DisputeStatus.RESOLVED })

      if (escrow && job && dispute) {
        const providerReceivesInKobo = escrow.providerReceives * 100

        // 3. Return the pending balance back to the Provider (since the refund failed)
        await Wallet.findOneAndUpdate(
          { user: new Types.ObjectId(job.assignedTo) },
          { $inc: { pendingBalance: providerReceivesInKobo } },
          { session }
        )

        // 4. Re-freeze the Escrow
        escrow.status = EscrowStatus.FROZEN
        await escrow.save({ session })

        // 5. Revert Job back to DISPUTE
        job.status = JobStatus.DISPUTE
        await job.save({ session })

        // 6. Reopen the Dispute so Admin can try again or select alternative resolution
        dispute.status = DisputeStatus.OPEN
        dispute.resolutionNote = `${dispute.resolutionNote} | SYSTEM NOTE: Paystack Refund Failed. Funds bounced back to platform. Dispute reopened.`
        await dispute.save({ session })

        // 7. Ledger Reversal: DEBIT the customer to reverse the REFUND entry made earlier
        await TransactionLedger.create(
          [
            {
              user: payment.customer,
              job: payment.job,
              type: TransactionLedgerType.DEBIT, // Debit to reverse the refund
              amount: payment.customerPays,
              reason: `Refund failed by bank. Reversal of refund entry. Funds returned to platform escrow. Dispute reopened.`,
              reference: payment.reference,
              details: { paystack_data: data },
            },
          ],
          { session }
        )

        logger.warn(
          `❌ Refund failed for reference: ${transaction_reference}. Dispute reopened and Ledgers balanced successfully.`
        )
      }
    }

    await session.commitTransaction()
  } catch (error) {
    await session.abortTransaction()
    logger.error('Error handling refund failure', error)
  } finally {
    session.endSession()
  }
}

// Get all payments:

const getAllPayments = async (query: TGetAllPayments) => {
  const { page = 1, limit = 10, netAmount, searchTerm, sortBy, sortOrder, fromDate, toDate } = query

  const pipeline: PipelineStage[] = [
    {
      $match: {},
    },
  ]

  // Get all payments:
  const payments = await Payment.aggregate(pipeline)

  return payments
}

export const paymentServices = {
  handleJobPaymentSuccess,
  handleJobPaymentFailed,
  handleRefundProcessed,
  handleRefundFailed,
  getAllPayments,
}
