import { Document, Types } from 'mongoose'
import type { TJobStatus } from '../Job/job.interface'
import type { TAuthRole } from '../User'

// Define Interface
export interface IJobStatusHistory {
  job: Types.ObjectId
  oldStatus: TJobStatus
  newStatus: TJobStatus
  changedByRole: TAuthRole
  changedBy: Types.ObjectId
  reason?: string
  createdAt: Date
  updatedAt: Date
}

export interface IJobStatusHistoryDocument extends IJobStatusHistory, Document {}
