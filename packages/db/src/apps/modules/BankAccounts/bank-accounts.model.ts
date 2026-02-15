import { model, Schema } from 'mongoose'
import type { IBankAccountsDocuments } from './bank-accounts.interface'

const bankAccountSchema = new Schema<IBankAccountsDocuments>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bankCode: {
      type: String,
      required: true,
    },
    accountNumber: {
      type: String,
      required: true,
    },
    accountName: {
      type: String,
      required: true,
    },
    currency: {
      type: String,
      default: 'NGN',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    paystackRecipientCode: {
      type: String,
      required: true,
    },
    verifiedAt: {
      type: Date,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  }
)

// Optional: prevent duplicates
bankAccountSchema.index({ provider: 1, accountNumber: 1, bankCode: 1 }, { unique: true })

export const BankAccount = model<IBankAccountsDocuments>('BankAccount', bankAccountSchema)
