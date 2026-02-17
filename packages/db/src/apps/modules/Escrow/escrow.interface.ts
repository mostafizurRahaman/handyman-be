import { Document, Types } from 'mongoose'
import type { EscrowStatus } from './escrow.constant'

export type TEscrowStatus = (typeof EscrowStatus)[keyof typeof EscrowStatus]

export interface IEscrow {
  job: Types.ObjectId
  payment: Types.ObjectId
  amount: number
  agreedPrice: number
  platformFee: number
  gstOnPlatformFee: number
  providerReceives: number
  gatewayFee: number
  customerPays: number
  status: TEscrowStatus
  lockedAt?: Date
  releasedAt?: Date
}

export interface IEscrowDocument extends IEscrow, Document {}
