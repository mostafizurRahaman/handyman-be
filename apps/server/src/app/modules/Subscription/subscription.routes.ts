import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'
import { subscriptionValidations } from './subscription.validations'
import { subscriptionController } from './subscription.controllers'

const router: Router = express.Router()

router.post(
  '/init',
  auth(AuthRoles.PROVIDER),
  validateRequest(subscriptionValidations.initSubscriptionSchema),
  subscriptionController.initSubscription
)

router.post('/cancel', auth(AuthRoles.PROVIDER), subscriptionController.cancelSubscription)

router.get(
  '/my-subscription',
  auth(AuthRoles.PROVIDER),
  subscriptionController.getMyCurrentSubscription
)

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(subscriptionValidations.getAllSubscriptionSchema),
  subscriptionController.getAllSubscriptons
)

export const subscriptionRoutes = router
