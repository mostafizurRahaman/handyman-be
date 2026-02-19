import { Document, Types } from 'mongoose'
import type { TDisputeStatus } from './dispute.constant'

export interface IDispute {
  job: Types.ObjectId
  customer: Types.ObjectId
  provider: Types.ObjectId
  reason: string
  customerEvidence?: string[]
  providerEvidence?: string[]
  status: TDisputeStatus
  resolvedBy?: Types.ObjectId
  resolutionNote?: string
}

export interface IDisputeDocument extends IDispute, Document {}
