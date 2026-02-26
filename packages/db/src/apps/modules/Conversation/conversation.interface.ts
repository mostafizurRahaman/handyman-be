import type { Document, Types } from 'mongoose'
import type { ConversationStatus } from './conversation.constant'

export interface IConversation {
  customer: Types.ObjectId
  provider: Types.ObjectId
  status: ConversationStatus
  lastMessage?: string
  lastMessagedAt?: Date
  createdAt?: Date
  updatedAt?: Date
}

export interface IConversationDocuments extends IConversation, Document {}
