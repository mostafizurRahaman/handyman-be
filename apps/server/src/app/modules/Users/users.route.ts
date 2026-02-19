import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { UserValidations } from './users.validation'
import { userControllers } from './users.controllers'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(UserValidations.getAllUsers),
  userControllers.getAllUsers
)

router.get(
  '/providers',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN, AuthRoles.CUSTOMER),
  validateRequest(UserValidations.getAllProviders),
  userControllers.getAllProviders
)

router.get(
  '/analytics',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(UserValidations.getUserAnalytics),
  userControllers.getUserOverview
)

router.get(
  '/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(UserValidations.getSingleUserByIdSchema),
  userControllers.getUserById
)

router.patch(
  '/:id/status',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(UserValidations.updateUserStausById),
  userControllers.updateUserStatusById
)

export const userRoutes = router
