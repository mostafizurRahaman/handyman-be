import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { providerValidation } from './provider.validation'
import { providerController } from './provider.controllers'

const router: Router = express.Router()

router.get(
  '/:id',
  auth(AuthRoles.CUSTOMER, AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(providerValidation.getProviderDetailsById),
  providerController.getProviderDetailsById
)

export const providerRoutes = router
