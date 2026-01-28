import { Document, Types } from 'mongoose'
import type { JobApplicationStatus } from './job-application.constant'

// Define Job Application Status Type
export type TJobApplicationStatus = (typeof JobApplicationStatus)[keyof typeof JobApplicationStatus]

// Define JobApplication Interface
export interface IJobApplication {
  job: Types.ObjectId
  provider: Types.ObjectId
  message: string
  proposed_price: number
  status: TJobApplicationStatus
  createdAt: Date
  updatedAt: Date
}

export interface IJobApplicationDocument extends IJobApplication, Document {}
