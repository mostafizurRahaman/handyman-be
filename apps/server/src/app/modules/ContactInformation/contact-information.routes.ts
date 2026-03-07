import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { contactInfoController } from './contact-information.controllers'
import { auth } from '@app/middlewares/auth'
import { contactInformationValications } from './contact-information.validations'

const router: Router = express.Router()

router.patch(
  '/',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(contactInformationValications.updateContactInformation),
  contactInfoController.updateOrCreateContactInfo
)

router.get(
  '/',

  contactInfoController.getContactInfo
)

export const contactInfoRoutes = router
