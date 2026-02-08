// job.model.ts

import { Schema, model } from 'mongoose'
import { JobSStatus, JobStatusValues } from './job.constant'
import type { IJobDocument } from './job.interface'
import { GetLocationPoints, GetLocationPointsValues } from '../Provider'

const JobSchema = new Schema<IJobDocument>(
  {
    customer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    address: {
      type: String,
      required: true,
    },

    location: {
      type: {
        type: String,
        enum: GetLocationPointsValues,
        required: true,
        default: GetLocationPoints.Point,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    images: [
      {
        type: String,
      },
    ],
    price: {
      type: Number,
      required: true,
    },
    aggreedPrice: {
      type: Number,
      required: true,
      default: 0,
    },
    status: {
      type: String,
      enum: JobStatusValues,
      default: JobSStatus.PENDING,
    },
    prefferedDate: {
      type: Date,
      required: true,
    },
    prefferedTime: {
      type: Date,
      required: true,
    },
  },

  { timestamps: true, versionKey: false }
)

JobSchema.index({ location: '2dsphere' })

export const Job = model<IJobDocument>('Job', JobSchema)
