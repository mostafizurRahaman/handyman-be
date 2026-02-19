import { Document } from 'mongoose'
import type { subscriptionIntervals, subscriptionOptions } from './subscription-plan.constant'

export type TSubscriptionInterval =
  (typeof subscriptionIntervals)[keyof typeof subscriptionIntervals]

export type TSubscriptionOptions = (typeof subscriptionOptions)[keyof typeof subscriptionOptions]

export interface ISubscriptionPlan {
  name: TSubscriptionOptions
  amount: number
  currency: string
  interval: TSubscriptionInterval
  payStackPlanCode: string
  createdAt: Date
  updatedAt: Date
}

export interface ISubscriptionPlanDocument extends ISubscriptionPlan, Document {}
