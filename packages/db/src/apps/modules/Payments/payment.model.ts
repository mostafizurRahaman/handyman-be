import { Schema, model } from 'mongoose'
import type { IPaymentDocument } from './payment.interface'
import { PaymentStatus, PaymentStatusValues } from './payement.constant'

const PaymentSchema = new Schema<IPaymentDocument>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
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
    gateway: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: PaymentStatusValues,
      default: PaymentStatus.INITIALIZED,
    },
  },
  { timestamps: true }
)

export const Payment = model<IPaymentDocument>('Payment', PaymentSchema)
