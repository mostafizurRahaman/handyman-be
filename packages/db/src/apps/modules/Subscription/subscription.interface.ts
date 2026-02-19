import { Document, Types } from 'mongoose'
import type { SubscriptionStatus } from './subscription.constant'

export type TSubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus]

export interface ISubscription {
  provider: Types.ObjectId
  plan: Types.ObjectId

  // Paystack fields
  paystackCustomerId: string
  paystackSubscriptionCode: string
  paystackEmailToken: string

  status: TSubscriptionStatus
  startDate?: Date
  endDate?: Date
  nextPaymentDate?: Date
  cancelledAt?: Date

  createdAt: Date
  updatedAt: Date
}

export interface ISubscriptionDocument extends ISubscription, Document {}
