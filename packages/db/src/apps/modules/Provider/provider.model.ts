import { Schema, model } from 'mongoose'
import type { IProvider } from './provider.interface'
import { GetLocationPoints, GetLocationPointsValues } from './provider.constant'

const ProviderSchema = new Schema<IProvider>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'User',
    },
    serviceCategory: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceCategory',
      required: true,
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
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
    weekdays: [
      {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true,
      },
    ],
  },
  { timestamps: true, versionKey: false }
)

ProviderSchema.index({ location: '2dsphere' })

export const Provider = model<IProvider>('Provider', ProviderSchema)
