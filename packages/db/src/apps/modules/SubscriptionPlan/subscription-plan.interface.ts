import { Document } from 'mongoose'
import type { subscriptionIntervals } from './subscription-plan.constant'

export type TSubscriptionInterval =
  (typeof subscriptionIntervals)[keyof typeof subscriptionIntervals]

export interface ISubscriptionPlan {
  name: string
  amount: number
  currency: string
  interval: TSubscriptionInterval
  payStackPlanCode: string
  createdAt: Date
  updatedAt: Date
}

export interface ISubscriptionPlanDocument extends ISubscriptionPlan, Document {}
