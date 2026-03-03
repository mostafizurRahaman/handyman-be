import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { contactValidations } from './contact.validations'
import { contactController } from './contact.controlleres'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.post(
  '/',
  validateRequest(contactValidations.createContactSchema),
  contactController.createContact
)

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(contactValidations.getAllContactSchema),
  contactController.getAllContacts
)

export const contactRoutes = router
