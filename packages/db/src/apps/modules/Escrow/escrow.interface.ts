import { Document, Types } from 'mongoose'
import type { EscrowStatus } from './escrow.constant'

export type TEscrowStatus = (typeof EscrowStatus)[keyof typeof EscrowStatus]

export interface IEscrow {
  job: Types.ObjectId
  payment: Types.ObjectId
  amount: number
  status: TEscrowStatus
  lockedAt?: Date
  releasedAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface IEscrowDocument extends IEscrow, Document {}
