import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'

import { AuthRoles } from 'packages/db/src'
import { notificationValidations } from './notification.validation'
import { validateRequest } from '@app/middlewares'
import { notificationControllers } from './notification.controllers'

const router: Router = express.Router()

router.patch(
  '/register-token',
  auth(AuthRoles.ADMIN, AuthRoles.CUSTOMER, AuthRoles.SUPER_ADMIN, AuthRoles.PROVIDER),
  validateRequest(notificationValidations.registerToken), 
  notificationControllers.registerToken
)
