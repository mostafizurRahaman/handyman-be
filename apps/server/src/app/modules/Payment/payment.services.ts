import { logger } from '@app/libs/logger'
import mongoose, { Types } from 'mongoose'
import {
  EscrowModel,
  EscrowStatus,
  Job,
  JobApplication,
  JobApplicationStatus,
  JobStatus,
  Payment,
  PaymentStatus,
  TransactionLedger,
  TransactionLedgerType,
  Wallet,
  type IEscrow,
  type IPayment,
} from 'packages/db/src'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const handleJobPaymentSuccess = async (data: Record<string, any>) => {
  logger.info('INSIDE Handle Job Payments')

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

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const paymentPayload: IPayment = {
      job,
      customer,
      amount: amount / 100,
      currency: 'NGN',
      gateway: 'paystack',
      agreedPrice,
      customerPays,
      platformFee,
      gstOnPlatformFee,
      gatewayFee,
      providerReceives,
      reference,
      status: PaymentStatus.HELD,
    }
    //  1. Create Detailed Payment Record
    const [payment] = await Payment.create([paymentPayload], { session })

    // 2. Create Escrow Record
    // The fees and taxes stay in your platform's main bank account.
    const escrowPayload: IEscrow = {
      job,
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
    }
    await EscrowModel.create([escrowPayload], { session })

    //  3. Update Job
    await Job.findByIdAndUpdate(
      job,
      {
        status: JobStatus.ACCEPTED,
        assignedTo: provider,
        agreedPrice,
        providerReceives,
      },
      { session }
    )

    // 4. Update Application
    await JobApplication.findByIdAndUpdate(
      jobApplication,
      {
        status: JobApplicationStatus.ACCEPTED,
      },
      { session }
    )

    //  5. Reject Other jobs status:
    await JobApplication.findByIdAndUpdate(
      {
        job,
        _id: {
          $ne: jobApplication,
        },
        status: JobApplicationStatus.PENDING,
      },
      {
        status: JobApplicationStatus.REJECTED,
      },
      { session }
    )

    // 6. Transaction Ledger (Optional: Record the tax/fee as platform revenue)
    await TransactionLedger.create(
      [
        // Customer Entry as (DEBIT)
        {
          user: customer,
          job,
          type: TransactionLedgerType.DEBIT,
          reference,
          amount: amount / 100,
          reason: `Job Payment Breakdown: 
            Bid(${agreedPrice}) 
            + Platform Fee(${platformFee}) 
            + GST(${gstOnPlatformFee}) 
            + Gateway Fee(${gatewayFee}) 
            = Customer Paid(${customerPays}) 
            | Provider Receives(${providerReceives})`,
          details: {
            amount: providerReceives,
            agreedPrice,
            customerPays,
            platformFee,
            gatewayFee,
            gstOnPlatformFee,
            providerReceives,
          },
        },
        // Provider Entry as (CREDIT)
        {
          user: provider,
          job,
          type: TransactionLedgerType.CREDIT,
          reference,
          amount: providerReceives,
          reason: `Job Payment Breakdown: 
            Bid(${agreedPrice}) 
            + Platform Fee(${platformFee}) 
            + GST(${gstOnPlatformFee}) 
            + Gateway Fee(${gatewayFee}) 
            = Customer Paid(${customerPays}) 
            | Provider Receives(${providerReceives})`,
          details: {
            amount: providerReceives,
            agreedPrice,
            customerPays,
            platformFee,
            gatewayFee,
            gstOnPlatformFee,
            providerReceives,
          },
        },
      ],
      { session }
    )

    // 7. Update wallet amount :
    await Wallet.findOneAndUpdate(
      {
        user: provider,
      },
      {
        $inc: {
          pendingBalance: providerReceives * 100,
        },
      },
      {
        new: true,
        upsert: true,
        session,
      }
    )

    await session.commitTransaction()
  } catch (error) {
    await session.abortTransaction()
    throw error
  } finally {
    session.endSession()
  }
}

export const paymentServices = {
  handleJobPaymentSuccess,
}
