import { Schema, model, Types } from 'mongoose'
import type { IMessage } from './message.interface'

const MessageSchema = new Schema<IMessage>(
  {
    conversation: {
      type: Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    attachments: {
      type: [String],
      default: [],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

MessageSchema.index({ conversation: 1, createdAt: 1 })

MessageSchema.index({ conversation: 1, isRead: 1 })

export const MessageModel = model<IMessage>('Message', MessageSchema)
