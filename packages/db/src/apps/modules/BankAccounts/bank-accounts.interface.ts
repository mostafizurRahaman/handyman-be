import type { Document, Types } from 'mongoose'

interface IBankAccounts {
  user: Types.ObjectId
  bankCode: string
  accountNumber: string
  accountName: string
  isVerified: boolean
  paystackRecipientCode: string
  currency: string
  verifiedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface IBankAccountsDocuments extends Document, IBankAccounts {}
