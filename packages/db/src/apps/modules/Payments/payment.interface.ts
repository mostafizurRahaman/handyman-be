import { Document, Types } from 'mongoose'
import type { PaymentStatus } from './payement.constant'

export type TPaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus]

export interface IPayment {
  job: Types.ObjectId
  customer: Types.ObjectId
  amount: number
  currency: string
  reference: string
  lastReference: string
  accessCode: string
  gateway: string
  status: TPaymentStatus
  agreedPrice: number
  platformFee: number
  gstOnPlatformFee: number
  providerReceives: number
  gatewayFee: number
  customerPays: number
  attemptCount: number
  expiresAt: Date // optional expiry of payment link
}

export interface IPaymentDocument extends IPayment, Document {}
