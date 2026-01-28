import { Schema, model } from 'mongoose'
import type { IVerification } from './verification.interface'
import { VerificationStatus, verificationStatusValues } from './verification.constant'

const VerificationSchema = new Schema<IVerification>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      ref: 'User',
    },

    nidFrontSide: {
      type: String,
    },
    nidBackSide: {
      type: String,
    },
    nidNumber: {
      type: String,
    },
    selfee: {
      type: String,
    },

    provider: {
      type: String,
      default: 'DIDIT',
    },
    diditSessionId: {
      type: String,
    },
    confidenceScore: {
      type: Number,
    },
    rawResponse: {
      type: Schema.Types.Mixed,
    },

    status: {
      type: String,
      enum: verificationStatusValues,
      default: VerificationStatus.PENDING,
    },
  },
  { timestamps: true }
)

export const VerificationModel = model<IVerification>('Verification', VerificationSchema)
