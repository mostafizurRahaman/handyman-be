/* eslint-disable no-unused-vars */
import { Server, Socket } from 'socket.io'
import { verifyToken } from '@repo/shared'
import configs from '@app/configs'
import { User, MessageModel, Conversation, type IUser, type IMessageDocuments } from '@repo/db'
import { logger } from '@app/libs/logger'
import { Types } from 'mongoose'

interface ServerToClientEvents {
  message_received: (_message: IMessageDocuments) => void
  display_typing: (_data: { userId: string; isTyping: boolean }) => void
  error: (_data: { message: string }) => void
  messages_marked_read: (_data: { conversationId: string; readBy: string }) => void
}

interface ClientToServerEvents {
  join_room: (_conversationId: string) => void
  send_message: (_data: { conversationId: string; message: string; attachments?: string[] }) => void
  typing: (_data: { conversationId: string; isTyping: boolean }) => void
  mark_read: (_conversationId: string) => void
}

type InterServerEvents = Record<string, never>
interface SocketData {
  user: IUser
}

export type TChatServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>
type TChatSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

export const setupChatSocket = (io: TChatServer): void => {
  io.use(async (socket, next) => {
    try {
      const token = (socket.handshake.auth?.token ||
        socket.handshake.headers?.token ||
        socket.handshake.query?.token) as string | undefined

      if (!token) return next(new Error('Authentication Token Missing'))

      const decoded = verifyToken(token, configs.jwt.accessToken.secret)
      const user = await User.findById(decoded?._id)
      logger.info('User', user?.toString())
      if (!user) return next(new Error('User Not Found'))

      socket.data.user = user
      next()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      logger.error('Socket Authentication Error', { error: err.message })
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket: TChatSocket) => {
    const user = socket.data.user!
    logger.info(`CONNECTION:  ${user.name} `)

    // JOIN ROOM with Security Check
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on('join_room', async ({ conversationId }: any) => {
      if (!Types.ObjectId.isValid(conversationId)) {
        logger.info('JOIN ROOM PARAM CHECK', {
          conversationId,
          isvalid: !Types.ObjectId.isValid(conversationId),
        })
        return //  not logged
      }

      // Verify user belongs to this conversation
      const conv = await Conversation.findById(conversationId)
      if (
        !conv ||
        (conv.customer.toString() !== user._id.toString() &&
          conv.provider.toString() !== user._id.toString())
      ) {
        logger.info('ERROR', 'Unauthorized to join this room') // not logged
        socket.emit('error', { message: 'Unauthorized to join this room' })
        return
      }
      logger.info(`User ${user.name} joined room: ${conversationId}`) // this line not logged
      void socket.join(conv?._id?.toString())
      logger.info(`User ${user.name} joined room: ${conversationId}`)
    })

    // SEND MESSAGE
    socket.on('send_message', async (data) => {
      const { conversationId, message, attachments } = data
      try {
        const conv = await Conversation.findById(conversationId)
        if (!conv) return

        const newMessage = await MessageModel.create({
          conversation: conv?._id,
          sender: user._id,
          message: message || '',
          attachments: attachments || [],
          isRead: false,
        })

        await Conversation.findByIdAndUpdate(conv?._id, {
          lastMessage: attachments?.length ? 'Sent an attachment' : message,
          lastMessagedAt: new Date(),
        })

        // Emit to everyone in the room
        io.to(conv?._id?.toString()).emit(
          'message_received',
          newMessage.toObject() as IMessageDocuments
        )
        logger.info('ConversationID', { conversationId: conv?._id })
      } catch (err) {
        logger.error('Failed to send message', { error: err })
        socket.emit('error', { message: 'Failed to send message' })
      }
    })

    // TYPING (Fixed to use .to() instead of io.to())
    socket.on('typing', (data) => {
      // .to(id) sends to everyone EXCEPT the sender
      socket.to(data.conversationId).emit('display_typing', {
        userId: user._id.toString(),
        isTyping: data.isTyping,
      })
      logger.info('ConversationID', {
        conversationId: data.conversationId,
        isTyping: data.isTyping,
      })
    })

    // MARK READ
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on('mark_read', async ({ conversationId }: any) => {
      logger.info('Mark Read payload', { conversationId })
      await MessageModel.updateMany(
        { conversation: conversationId, sender: { $ne: user._id }, isRead: false },
        { $set: { isRead: true } }
      )
      socket.to(conversationId).emit('messages_marked_read', {
        conversationId: conversationId,
        readBy: user._id.toString(),
      })
    })

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${user.name}`)
    })
  })
}
