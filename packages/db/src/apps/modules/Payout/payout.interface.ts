import { Document, Types } from 'mongoose'
import type { PayoutStatus } from './payout.constant'

// Status type
export type TPayoutStatus = (typeof PayoutStatus)[keyof typeof PayoutStatus]

// Payout interface
export interface IPayout {
  job: Types.ObjectId
  provider: Types.ObjectId
  grossAmount: number
  platformFee: number
  netAmount: number
  paystackRecipientCode: string
  paystackTransferRef?: string
  status: TPayoutStatus
  createdAt: Date
  updatedAt: Date
}

export interface IPayoutDocument extends IPayout, Document {}
