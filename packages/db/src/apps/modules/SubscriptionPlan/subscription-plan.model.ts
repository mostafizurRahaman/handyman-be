// subscriptionPlan.model.ts

import { Schema, model } from 'mongoose'
import type { ISubscriptionPlanDocument } from './subscription-plan.interface'
import { subscriptionIntervalValues, subscriptionOptionValues } from './subscription-plan.constant'

const SubscriptionPlanSchema = new Schema<ISubscriptionPlanDocument>(
  {
    name: {
      type: String,
      required: true,
      enum: subscriptionOptionValues,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      required: true,
      uppercase: true,
      default: 'NGN',
    },
    interval: {
      type: String,
      enum: subscriptionIntervalValues,
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
