import express, { Router } from 'express'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from '@repo/db'
import { validateRequest } from '@app/middlewares'
import { payoutValidations } from './payout.validations'
import { payoutController } from './payout.controller'

const router : Router= express.Router()

router.post(
  '/withdraw',
  auth(AuthRoles.PROVIDER),
  validateRequest(payoutValidations.requestPayoutSchema),
  payoutController.requestPayout
)

export const payoutRoutes = router
