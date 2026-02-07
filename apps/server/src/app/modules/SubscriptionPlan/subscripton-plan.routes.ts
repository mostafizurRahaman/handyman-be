import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { subscriptionPlanValidations } from './subscriptoin-plan.validations'
import { subscriptonPlanController } from './subscription-plan.controllers'

const router: Router = express.Router()

router.post(
  '/create',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(subscriptionPlanValidations.createSubPlanSchema),
  subscriptonPlanController.createSubcriptionPlan
)

router.get(
  '/all',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN, AuthRoles.PROVIDER),
  validateRequest(subscriptionPlanValidations.subscriptionQuerySchema),
  subscriptonPlanController.getAllSubscriptionPlans
)

router.post('/webhook', subscriptonPlanController.subscriptionWebhook)

export const subscriptionPlanRoutes = router
