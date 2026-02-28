
import { model, Schema, Types } from 'mongoose'
import type { INotificationToken } from './notificationToken.interface'

const NotificationTokenSchema = new Schema<INotificationToken>(
  {
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    token: {
      type: String,
      required: true,
    },
    deviceType: {
      type: String,
      enum: ['android', 'ios', 'web'],
      required: true,
    },
    isActive: { type: Boolean, default: true },
    lastUsedAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
)

export const NotificationToken = model<INotificationToken>(
  'NotificationToken',
  NotificationTokenSchema
)
