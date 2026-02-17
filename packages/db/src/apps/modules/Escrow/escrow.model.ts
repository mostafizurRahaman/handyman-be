import { Schema, model } from 'mongoose'
import { EscrowStatus, EscrowStatusValues } from './escrow.constant'
import type { IEscrowDocument } from './escrow.interface'

const EscrowSchema = new Schema<IEscrowDocument>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    agreedPrice: { type: Number, required: true },
    platformFee: { type: Number, required: true },
    gstOnPlatformFee: { type: Number, required: true },
    providerReceives: { type: Number, required: true },
    gatewayFee: { type: Number, required: true },
    customerPays: { type: Number, required: true },
    status: {
      type: String,
      enum: EscrowStatusValues,
      default: EscrowStatus.LOCKED,
    },
    lockedAt: {
      type: Date,
      default: () => new Date(),
    },
    releasedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, versionKey: false }
)

export const EscrowModel = model<IEscrowDocument>('Escrow', EscrowSchema)
