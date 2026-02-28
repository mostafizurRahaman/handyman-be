import { Schema, model, Types } from 'mongoose'

export enum NotificationType {
  JOB_CREATED = 'JOB_CREATED',
  JOB_ASSIGNED = 'JOB_ASSIGNED',
  JOB_COMPLETED = 'JOB_COMPLETED',
  PAYMENT_SUCCESS = 'PAYMENT_SUCCESS',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  MESSAGE_RECEIVED = 'MESSAGE_RECEIVED',
  SUBSCRIPTION_EXPIRED = 'SUBSCRIPTION_EXPIRED',
  PAYOUT_PROCESSED = 'PAYOUT_PROCESSED',
}

const NotificationSchema = new Schema(
  {
    user: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: { type: String, required: true },
    body: { type: String, required: true },
    type: {
      type: String,
      enum: Object.values(NotificationType),
      required: true,
      index: true,
    },
    data: {
      type: Schema.Types.Mixed,
    },
    isRead: { type: Boolean, default: false, index: true },
    readAt: { type: Date, default: null },
    sentViaPush: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
)

NotificationSchema.index({ user: 1, createdAt: -1 })

export const Notification = model('Notification', NotificationSchema)
