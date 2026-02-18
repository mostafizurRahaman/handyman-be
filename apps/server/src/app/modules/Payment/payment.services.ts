import { logger } from '@app/libs/logger'
import mongoose, { Types } from 'mongoose'
import {
  AuthRoles,
  EscrowModel,
  EscrowStatus,
  Job,
  JobApplication,
  JobApplicationStatus,
  JobStatus,
  JobStatusHistory,
  Payment,
  PaymentStatus,
  TransactionLedger,
  TransactionLedgerType,
  Wallet,
  type IEscrow,
} from 'packages/db/src'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'

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
      {
        user: providerId,
        job: jobId,
        type: TransactionLedgerType.CREDIT,
        reference,
        amount: providerReceives,
        reason: `Provider receives: ${providerReceives}`,
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
export const paymentServices = {
  handleJobPaymentSuccess,
}
