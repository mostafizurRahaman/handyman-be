import { Schema, model } from 'mongoose'
import type { IPaymentDocument } from './payment.interface'
import { PaymentStatus, PaymentStatusValues } from './payement.constant'

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
      unique: true,
    },
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
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
    currency: {
      type: String,
      required: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    lastReference: { type: String, required: true },
    gateway: {
      type: String,
      required: true,
    },
    accessCode: {
      type: String,
      required: true,
      select: false,
    },
    status: {
      type: String,
      enum: PaymentStatusValues,
      default: PaymentStatus.INITIALIZED,
    },
    attemptCount: { type: Number, default: 1 },
    expiresAt: { type: Date },
  },
  { timestamps: true }
)

export const Payment = model<IPaymentDocument>('Payment', PaymentSchema)
