import { Document, Types } from 'mongoose'
import type { JobSStatus } from './job.constant'

// Define Job Status Type
export type TJobStatus = (typeof JobSStatus)[keyof typeof JobSStatus]

// Define Job Interface
export interface IJob {
  customer: Types.ObjectId
  assignedTo?: Types.ObjectId
  category: Types.ObjectId
  title: string
  description?: string
  location: string
  lat: number
  long: number
  images?: string[]
  price: number
  aggreedPrice: number
  status: TJobStatus
  prefferedDate: Date
  prefferedTime: Date
  createdAt: Date
  updatedAt: Date
}

export interface IJobDocument extends IJob, Document {}
