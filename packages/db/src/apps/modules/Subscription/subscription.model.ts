// subscriptionPlan.model.ts

import { Schema, model } from 'mongoose'
import type { ISubscriptionPlanDocument } from './subscription.interface'

const SubscriptionPlanSchema = new Schema<ISubscriptionPlanDocument>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'BDT',
    },
    interval: {
      type: String,
      enum: ['MONTHLY', 'YEARLY'],
      required: true,
    },
    payStackPlanCode: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
)

export const SubscriptionPlan = model<ISubscriptionPlanDocument>(
  'SubscriptionPlan',
  SubscriptionPlanSchema
)
