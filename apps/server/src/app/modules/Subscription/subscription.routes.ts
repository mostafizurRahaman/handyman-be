import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'
import { subscriptionValidations } from './subscription.validations'
import { subscriptionController } from './subscription.controllers'

const router: Router = express.Router()

router.post(
  '/init',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(subscriptionValidations.initSubscriptionSchema),
  subscriptionController.initSubscription
)

export const subscriptionRoutes = router
