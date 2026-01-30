import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { adminValidations } from './admin.validation'
import { AdminController } from './admin.controller'
import { multerFactory } from 'packages/media-hub/src'

const router: Router = express.Router()

router.post(
  '/create',
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).single('profileImage'),
  validateRequest(adminValidations.createAdmin),
  AdminController.createAdmin
)

export const adminRoutes = router
