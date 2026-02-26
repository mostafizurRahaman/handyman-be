import {
  BankAccount,
  Payout,
  PayoutStatus,
  TransactionLedger,
  TransactionLedgerType,
  Wallet,
  type IUser,
} from '@repo/db'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import axios from 'axios'
import configs from '@app/configs'
import mongoose from 'mongoose'
import { logger } from '@app/libs/logger'

const requestPayout = async (user: IUser, payload: { amount: number; bankAccountId: string }) => {
  const { amount, bankAccountId } = payload

  // 1. Check for active payout requests
  // We prevent multiple overlapping requests to avoid concurrency issues
  const existingPayout = await Payout.findOne({
    provider: user._id,
    status: {
      $in: [PayoutStatus.PENDING, PayoutStatus.PROCESSING],
    },
  })

  if (existingPayout) {
    throw new AppError(
      httpStatus.CONFLICT,
      `You already have an active payout request (${existingPayout.status.toLowerCase()}). Please wait for it to be processed.`
    )
  }

  // 2. Verify Bank Account ownership and status
  const bankAccount = await BankAccount.findOne({ _id: bankAccountId, user: user._id })
  if (!bankAccount) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'The selected bank account was not found or is not linked to your profile.'
    )
  }

  // 3. Check Wallet Balance
  const wallet = await Wallet.findOne({ user: user._id })
  const amountInKobo = Math.round(amount * 100)

  if (!wallet || wallet.balance < amountInKobo) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Insufficient funds. Your wallet balance is less than the requested withdrawal amount.'
    )
  }

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // 4. Deduct from Wallet immediately (Escrow/Lock the funds)
    wallet.balance -= amountInKobo
    await wallet.save({ session })

    // 5. Generate a unique reference
    const transferRef = `POUT_${Date.now()}_${user._id.toString().slice(-4)}`

    // 6. Create Payout Record in PENDING state
    const [payout] = await Payout.create(
      [
        {
          provider: user._id,
          netAmount: amount, // Storing in Naira
          bankAccount: bankAccount._id,
          paystackTransferRef: transferRef,
          paystackRecipientCode: bankAccount.paystackRecipientCode,
          status: PayoutStatus.PENDING,
        },
      ],
      { session }
    )

    // 7. Initiate Paystack Transfer
    const response = await axios.post(
      'https://api.paystack.co/transfer',
      {
        source: 'balance',
        amount: amountInKobo,
        reference: transferRef,
        recipient: bankAccount.paystackRecipientCode,
        // This "reason" often appears on the user's bank statement
        reason: `Withdrawal from ${configs.site.name || 'TrustedHand'}`,
      },
      {
        headers: {
          Authorization: `Bearer ${configs.payStackConfig.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    // If Paystack returns status: false, it's a validation error (e.g. insufficient provider balance)
    if (!response.data.status) {
      throw new Error(response.data.message || 'The payment gateway rejected the transfer request.')
    }

    // 8. Update internal Payout record with the transfer reference
    payout!.paystackTransferRef = transferRef
    await payout!.save({ session })

    // 9. Create Ledger Entry for internal audit
    await TransactionLedger.create(
      [
        {
          user: user._id,
          type: TransactionLedgerType.DEBIT,
          amount: amount,
          reason: `Payout initiated for ₦${amount.toLocaleString()} to ${bankAccount.accountName} (${bankAccount.bankCode})`,
          reference: transferRef,
          details: {
            bankAccountId: bankAccount._id,
            accountNumber: bankAccount.accountNumber,
            bankName: bankAccount.accountName,
            initiatedAt: new Date(),
          },
        },
      ],
      { session }
    )

    await session.commitTransaction()
    return payout
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    await session.abortTransaction()

    // Log the full error for internal debugging
    logger.error('Payout Request Error:', {
      userId: user._id,
      error: error.response?.data || error.message,
    })

    // If Paystack gave us a specific reason for rejection, pass it to the user
    const gatewayMessage = error.response?.data?.message
      ? `Gateway Error: ${error.response.data.message}`
      : 'The payout could not be processed due to a technical error with the payment provider.'

    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `${gatewayMessage} Your wallet balance has been restored.`
    )
  } finally {
    session.endSession()
  }
}

export const payoutServices = { requestPayout }
