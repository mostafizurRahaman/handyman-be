import type { Document, Types } from 'mongoose'
import type { NotificationType } from './notification.model'

export interface INotification {
  user: Types.ObjectId
  title: string
  body: string
  type: NotificationType
  data: Record<string, unknown>
  isRead: boolean
  readAt?: Date
  sentViaPush: boolean
}

export interface INotificationDocument extends INotification, Document {}
