import { catchAsync, sendResponse } from '@repo/shared'
import { ChatService } from './chat.service'
import httpStatus from 'http-status'
import { uploadMultipleFileToS3 } from '@repo/media-hub'

const startConversation = catchAsync(async (req, res) => {
  const result = await ChatService.startConversation(req.user._id?.toString(), req.body)
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: 'Chat session ready',
    data: result,
  })
})

const getMyConversations = catchAsync(async (req, res) => {
  const result = await ChatService.getMyConversations(req.user._id?.toString())
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Conversations retrieved',
    data: result,
  })
})

const getMessages = catchAsync(async (req, res) => {
  const result = await ChatService.getMessages(req.params.conversationId as string, req.query)
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Message history retrieved',
    data: result.data,
    meta: result.meta,
  })
})

const uploadChatAttachments = catchAsync(async (req, res) => {
  const files = req.files as Express.Multer.File[]
  const uploads = await uploadMultipleFileToS3(files, 'chat-attachments')
  const urls = uploads.map((u) => u.url)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Files uploaded successfully',
    data: urls,
  })
})

export const ChatController = {
  startConversation,
  getMyConversations,
  getMessages,
  uploadChatAttachments,
}
