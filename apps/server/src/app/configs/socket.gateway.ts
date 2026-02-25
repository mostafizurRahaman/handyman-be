/* eslint-disable no-unused-vars */
import { Server, Socket } from 'socket.io'
import { verifyToken } from '@repo/shared'
import configs from '@app/configs'
import { User, MessageModel, Conversation, type IUser, type IMessageDocuments } from '@repo/db'
import { logger } from '@app/libs/logger'
import { Types } from 'mongoose'

/**
 * 1. Define Typed Interfaces for the Gateway
 * Using underscore prefixes for interface parameters can help bypass
 * misconfigured ESLint "unused-vars" rules in type definitions.
 */
interface ServerToClientEvents {
  message_received: (_message: IMessageDocuments) => void
  display_typing: (_data: { userId: string; isTyping: boolean }) => void
  error: (_data: { message: string }) => void
}

interface ClientToServerEvents {
  join_room: (_conversationId: string) => void
  send_message: (_data: { conversationId: string; message: string; attachments?: string[] }) => void
  typing: (_data: { conversationId: string; isTyping: boolean }) => void
}

/**
 * Use a Type instead of an empty Interface to satisfy
 * @typescript-eslint/no-empty-object-type
 */
type InterServerEvents = Record<string, never>

interface SocketData {
  user: IUser
}

/**
 * Type alias for our custom Server instance
 */
export type TChatServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>

/**
 * Type alias for our custom Socket instance
 */
type TChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

export const setupChatSocket = (io: TChatServer): void => {
  // 2. Authentication Middleware
  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token ||
        socket.handshake.headers?.token ||
        socket.handshake.query?.token) as string | undefined
      // const token = authHeader || (socket.handshake.headers?.token as string)

      if (!token) {
        return next(new Error('Authentication Token Missing'))
      }

      const decoded = verifyToken(token, configs.jwt.accessToken.secret)

      if (!decoded?._id) {
        return next(new Error('Invalid Token'))
      }

      const user = await User.findById(decoded._id)
      if (!user) {
        return next(new Error('User Not Found'))
      }

      socket.data.user = user
      next()
    } catch (err) {
      logger.error('Socket Authentication Error:', err)
      next(new Error('Unauthorized'))
    }
  })

  // We explicitly use the Socket type here to solve the "defined but never used" error
  io.on('connection', (socket: TChatSocket) => {
    const user = socket.data.user

    if (!user) {
      socket.disconnect()
      return
    }

    logger.info(`💬 Socket connected: ${user.name} (${user.role})`)

    socket.on('join_room', (conversationId: string) => {
      if (Types.ObjectId.isValid(conversationId)) {
        void socket.join(conversationId)
        logger.debug(`User ${user._id} joined room: ${conversationId}`)
      }
    })

    socket.on('send_message', async (data) => {
      const { conversationId, message, attachments } = data

      try {
        if (!message && (!attachments || attachments.length === 0)) {
          socket.emit('error', { message: 'Message cannot be empty' })
          return
        }

        const newMessage = await MessageModel.create({
          conversation: new Types.ObjectId(conversationId),
          sender: user._id,
          message: message || '',
          attachments: attachments || [],
          isRead: false,
        })

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: attachments?.length ? 'Sent an attachment' : message,
          lastMessagedAt: new Date(),
        })

        io.to(conversationId?.toString()).emit(
          'message_received',
          newMessage?.toObject() as IMessageDocuments
        )
      } catch (err) {
        logger.error('Socket Message Error:', err)
        socket.emit('error', { message: 'Failed to deliver message' })
      }
    })

    socket.on('typing', (data) => {
      const { conversationId, isTyping } = data
      logger.info('Typing event  sent')
      io.to(conversationId?.toString()).emit('display_typing', {
        userId: (user._id as Types.ObjectId).toString(),
        isTyping,
      })
      logger.info('Typing event  recieved')
    })

    socket.on('disconnect', (reason) => {
      logger.info(`🔌 Socket disconnected: ${user.name} | Reason: ${reason}`)
    })
  })
}
