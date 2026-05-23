import { Document, Types } from 'mongoose'
import type { JobStatus } from './job.constant'
import type { IGeoPoint } from '../Provider'

// Define Job Status Type
export type TJobStatus = (typeof JobStatus)[keyof typeof JobStatus]

// Define Job Interface
export interface IJob {
  customer: Types.ObjectId
  assignedTo?: Types.ObjectId
  category: Types.ObjectId
  title: string
  description?: string
  address: string
  location: IGeoPoint
  city: string
  images?: string[]
  price: number
  aggreedPrice: number
  providerReceives: number
  completionNote?: string
  completionAttachments?: string[]
  disputeReason: string
  disputedAt: Date
  status: TJobStatus
  prefferedDate: Date
  prefferedTime: Date
  completedAt: Date
  closedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface IJobDocument extends IJob, Document {}
