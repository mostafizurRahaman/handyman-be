import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { adminValidations } from './admin.validation'
import { AdminController } from './admin.controller'
import { multerFactory } from 'packages/media-hub/src'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

// 1. Create Admin:
router.post(
  '/create',
  auth(AuthRoles.SUPER_ADMIN),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).single('profileImage'),
  validateRequest(adminValidations.createAdmin),
  AdminController.createAdmin
)

// 2.  Edit Admin:
router.patch(
  '/update/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).single('profileImage'),
  validateRequest(adminValidations.updateAdmin),
  AdminController.updateAdmin
)

// 3. Delete Admin:
router.delete(
  '/delete/:id',
  auth(AuthRoles.SUPER_ADMIN),
  validateRequest(adminValidations.deleteAdmin),
  AdminController.deleteAdmin
)

// 4. Get Admin :
router.get(
  '/:id', 
  // auth(AuthRoles.SUPER_ADMIN), 
  // validateRequest(adminValidations.getAdmin),
AdminController.getAdmin
) 


export const adminRoutes = router
