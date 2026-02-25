// payout.model.ts

import { Schema, model } from 'mongoose'
import { PayoutStatus, PayoutStatusValues } from './payout.constant'
import type { IPayoutDocument } from './payout.interface'

const PayoutSchema = new Schema<IPayoutDocument>(
  {
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    bankAccount: {
      type: Schema.Types.ObjectId,
      ref: 'BankAccount',
      required: true,
    },

    netAmount: {
      type: Number,
      required: true,
    },
    paystackRecipientCode: {
      type: String,
      required: true,
    },
    paystackTransferRef: {
      type: String,
      default: null,
    },
    status: {
      type: String,
      enum: PayoutStatusValues,
      default: PayoutStatus.PENDING,
    },
  },
  {
    timestamps: true,
  }
)

export const Payout = model<IPayoutDocument>('Payout', PayoutSchema)
