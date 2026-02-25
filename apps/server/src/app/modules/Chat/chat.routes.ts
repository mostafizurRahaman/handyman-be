import express, { Router } from 'express'
import { auth } from '@app/middlewares/auth'
import { ChatController } from './chat.controller'
import { AuthRoles } from '@repo/db'
import { multerFactory } from '@repo/media-hub'

const router: Router = express.Router()

router.post(
  '/start',
  auth(AuthRoles.CUSTOMER, AuthRoles.PROVIDER),
  ChatController.startConversation
)
router.get(
  '/conversations',
  auth(AuthRoles.CUSTOMER, AuthRoles.PROVIDER),
  ChatController.getMyConversations
)
router.get(
  '/messages/:conversationId',
  auth(AuthRoles.CUSTOMER, AuthRoles.PROVIDER),
  ChatController.getMessages
)
router.post(
  '/upload',
  auth(AuthRoles.CUSTOMER, AuthRoles.PROVIDER),
  multerFactory({ category: 'image', maxSizeInMB: 5 }).array('files', 5),
  ChatController.uploadChatAttachments
)

export const chatRoutes = router
