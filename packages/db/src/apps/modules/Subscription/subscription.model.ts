// subscription.model.ts

import { Schema, model } from 'mongoose'
import { SubscriptionStatus, SubscriptionStatusValues } from './subscription.constant'
import type { ISubscriptionDocument } from './subscription.interface'

const SubscriptionSchema = new Schema<ISubscriptionDocument>(
  {
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    plan: {
      type: Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },

    paystackSubscriptionCode: {
      type: String,
      required: true,
      unique: true,
    },

    paystackEmailToken: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: SubscriptionStatusValues,
      default: SubscriptionStatus.ACTIVE,
      index: true,
    },

    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

export const Subscription = model<ISubscriptionDocument>('Subscription', SubscriptionSchema)
