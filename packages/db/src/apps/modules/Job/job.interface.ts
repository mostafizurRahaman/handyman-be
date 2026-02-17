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
  images?: string[]
  price: number
  aggreedPrice: number
  providerReceives: number
  status: TJobStatus
  prefferedDate: Date
  prefferedTime: Date
  createdAt: Date
  updatedAt: Date
}

export interface IJobDocument extends IJob, Document {}
