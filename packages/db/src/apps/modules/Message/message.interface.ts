import { Document, Types } from 'mongoose'

export interface IMessage extends Document {
  conversation: Types.ObjectId
  sender: Types.ObjectId
  message: string
  attachments?: string[]
  isRead: boolean
  createdAt: Date
  updatedAt: Date
}
export interface IMessageDocuments extends IMessage, Document {}
