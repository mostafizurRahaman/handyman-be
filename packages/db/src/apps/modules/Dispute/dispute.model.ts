import { Schema, model, Types } from 'mongoose'
import type { IDisputeDocument } from './dispute.interface'
import { DisputeStatus } from './dispute.constant'

const DisputeSchema = new Schema<IDisputeDocument>(
  {
    job: {
      type: Types.ObjectId,
      ref: 'Job',
      required: true,
      index: true,
      unique: true,
    },
    customer: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
    },
    customerEvidence: {
      type: [String],
      default: [],
    },
    providerEvidence: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: Object.values(DisputeStatus),
      default: DisputeStatus.OPEN,
      index: true,
    },
    resolvedBy: {
      type: Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolutionNote: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

DisputeSchema.index({ customer: 1, provider: 1, status: 1 })

export const Dispute = model<IDisputeDocument>('Dispute', DisputeSchema)
