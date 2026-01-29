import { Document, Types } from 'mongoose'
import type { SubscriptionTransactionStatus } from './subscriptionTransaction.constant'

export type TSubscriptionTransactionStatus =
  (typeof SubscriptionTransactionStatus)[keyof typeof SubscriptionTransactionStatus]

export interface ISubscriptionTransaction {
  subscription: Types.ObjectId
  amount: number
  currency: string
  reference: string
  status: TSubscriptionTransactionStatus
  createdAt: Date
  updatedAt: Date
}

export interface ISubscriptionTransactionDocument extends ISubscriptionTransaction, Document {}
