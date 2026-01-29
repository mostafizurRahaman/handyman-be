// subscriptionTransaction.model.ts

import { Schema, model } from 'mongoose'
import {
  SubscriptionTransactionStatus,
  SubscriptionTransactionStatusValues,
} from './subscriptionTransaction.constant'
import type { ISubscriptionTransactionDocument } from './subscriptionTransaction.interface'

const SubscriptionTransactionSchema = new Schema<ISubscriptionTransactionDocument>(
  {
    subscription: {
      type: Schema.Types.ObjectId,
      ref: 'Subscription',
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
    },
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    status: {
      type: String,
      enum: SubscriptionTransactionStatusValues,
      default: SubscriptionTransactionStatus.INITIALIZED,
      index: true,
    },
  },
  {
    timestamps: true,
  }
)

export const SubscriptionTransaction = model<ISubscriptionTransactionDocument>(
  'SubscriptionTransaction',
  SubscriptionTransactionSchema
)
