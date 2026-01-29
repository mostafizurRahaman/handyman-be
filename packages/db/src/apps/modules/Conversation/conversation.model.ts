import { Schema, model, Types } from 'mongoose'
import type { IConversation } from './conversation.interface'
import { CONVERSATION_STATUS } from './conversation.constant'

const ConversationSchema = new Schema<IConversation>(
  {
    job: {
      type: Types.ObjectId,
      ref: 'Job',
      required: true,
      unique: true,
      index: true,
    },

    customer: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    provider: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    status: {
      type: String,
      enum: Object.values(CONVERSATION_STATUS),
      default: CONVERSATION_STATUS.ACTIVE,
      required: true,
      index: true,
    },

    lastMessage: {
      type: String,
      trim: true,
    },

    lastMessagedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

ConversationSchema.index({
  customer: 1,
  provider: 1,
  lastMessagedAt: -1,
})

export const Conversation = model<IConversation>('Conversation', ConversationSchema)
