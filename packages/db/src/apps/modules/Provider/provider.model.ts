import { Schema, model } from 'mongoose'
import type { IProvider } from './provider.interface'

const ProviderSchema = new Schema<IProvider>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      required: true,
      unique: true,
      ref: 'User',
    },
    serviceCategory: [
      {
        type: Schema.Types.ObjectId,
        ref: 'ServiceCategory',
        required: true,
      },
    ],
    location: {
      type: String,
      required: true,
    },
    lat: {
      type: Number,
      required: true,
    },
    long: {
      type: Number,
      required: true,
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

export const ProviderModel = model<IProvider>('Provider', ProviderSchema)
