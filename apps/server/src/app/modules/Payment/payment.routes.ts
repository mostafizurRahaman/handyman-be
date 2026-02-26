import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { paymentController } from './payments.controller'
import { validateRequest } from '@app/middlewares'
import { paymentValidations } from './payment.validations'

const router: Router = express.Router()

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(paymentValidations.getAllPayments),
  paymentController.getAllPayments
)

router.get(
  '/revenue-stats',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  paymentController.getEarningSummary
)

router.get(
  '/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(paymentValidations.getSinglePaymentById),
  paymentController.getSinglePaymentById
)

export const paymentRoutes = router
