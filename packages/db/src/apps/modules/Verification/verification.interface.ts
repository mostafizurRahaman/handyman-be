import type { Document } from 'mongoose'
import type { VerificationStatus } from './verification.constant'

export type TVerificationStatus = (typeof VerificationStatus)[keyof typeof VerificationStatus]

export interface IVerification extends Document {
  userId: string
  nidFrontSide?: string
  nidBackSide?: string
  nidNumber?: string
  selfee?: string
  provider?: string
  status: TVerificationStatus
  diditSessionId?: string
  confidenceScore?: number
  rawResponse?: Record<string, unknown>
  createdAt: Date
  updatedAt: Date
}
