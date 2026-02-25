import { Document, Types } from 'mongoose'
import type { PayoutStatus } from './payout.constant'

// Status type
export type TPayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus]

// Payout interface
export interface IPayout {
  provider: Types.ObjectId
  bankAccount: Types.ObjectId
  reference: string
  netAmount: number
  paystackRecipientCode: string
  paystackTransferRef?: string
  status: TPayoutStatus
  createdAt: Date
  updatedAt: Date
}

export interface IPayoutDocument extends IPayout, Document {}
