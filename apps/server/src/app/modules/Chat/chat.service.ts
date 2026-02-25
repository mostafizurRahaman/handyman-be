import { Conversation, MessageModel, User } from '@repo/db'
import { AppError, QueryBuilder } from '@repo/shared'
import httpStatus from 'http-status'

const startConversation = async (userId: string, payload: { opponentId: string }) => {
  const { opponentId } = payload

  // 1. Identify roles (Who is the customer and who is the provider?)
  const me = await User.findById(userId)
  const opponent = await User.findById(opponentId)

  if (!opponent) throw new AppError(httpStatus.NOT_FOUND, 'User not found')

  let customerId: string
  let providerId: string

  if (me?.role === 'customer' && opponent.role === 'provider') {
    customerId = userId
    providerId = opponentId
  } else if (me?.role === 'provider' && opponent.role === 'customer') {
    providerId = userId
    customerId = opponentId
  } else {
    throw new AppError(httpStatus.BAD_REQUEST, 'Chat must be between a Customer and a Provider')
  }

  // 2. Find or Create the single persistent thread
  const conversation = await Conversation.findOneAndUpdate(
    { customer: customerId, provider: providerId },
    { customer: customerId, provider: providerId },
    { upsert: true, new: true }
  ).populate('customer provider', 'name profileImage email role')

  return conversation
}

const getMyConversations = async (userId: string) => {
  return await Conversation.find({
    $or: [{ customer: userId }, { provider: userId }],
  })
    .sort({ lastMessagedAt: -1, updatedAt: -1 })
    .populate('customer provider', 'name profileImage role')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getMessages = async (conversationId: string, query: any) => {
  const messageQuery = new QueryBuilder(MessageModel.find({ conversation: conversationId }), query)
    .sort() // Defaults to createdAt desc
    .paginate()

  const data = await messageQuery.modelQuery.populate('sender', 'name profileImage role')
  const meta = await messageQuery.countTotal()

  return { data, meta }
}

export const ChatService = { startConversation, getMyConversations, getMessages }
