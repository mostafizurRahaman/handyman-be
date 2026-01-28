import { Schema, model } from 'mongoose'
import type { IJobApplicationDocument } from './job-application.interface'
import { JobApplicationStatus, JobApplicationStatusValues } from './job-application.constant'

const JobApplicationSchema = new Schema<IJobApplicationDocument>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    proposed_price: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: JobApplicationStatusValues,
      default: JobApplicationStatus.PENDING,
    },
  },
  { timestamps: true }
)

export const JobApplication = model<IJobApplicationDocument>('JobApplication', JobApplicationSchema)
