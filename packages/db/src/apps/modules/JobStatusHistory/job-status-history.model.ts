// packages/db/src/apps/modules/Job/jobStatusHistory.model.ts

import { Schema, model } from 'mongoose'
import { JobStatusValues } from '../Job/job.constant'
import { AuthRolesValues } from '../User'
import type { IJobStatusHistoryDocument } from './job-status-history.interface'

const JobStatusHistorySchema = new Schema<IJobStatusHistoryDocument>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    oldStatus: {
      type: String,
      enum: JobStatusValues,
      required: true,
    },
    newStatus: {
      type: String,
      enum: JobStatusValues,
      required: true,
    },
    changedByRole: {
      type: String,
      enum: AuthRolesValues,
      required: true,
    },
    changedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reason: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
)

export const JobStatusHistory = model<IJobStatusHistoryDocument>(
  'JobStatusHistory',
  JobStatusHistorySchema
)
