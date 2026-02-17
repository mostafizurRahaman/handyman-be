import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { multerFactory } from '@repo/media-hub'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from '@repo/db'
import { serviceCategoryValidations } from './service-category.validations'
import { serviceController } from './service-category.controllers'

const router: Router = express.Router()

// 1. Create Admin:
router.post(
  '/',
  auth(AuthRoles.SUPER_ADMIN),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).single('image'),
  validateRequest(serviceCategoryValidations.createServiceCategorySchema),
  serviceController.createCategory
)

// 2.  Edit Admin:
router.patch(
  '/:id',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).single('image'),
  validateRequest(serviceCategoryValidations.updateServiceCategorySchema),
  serviceController.updateCategory
)

// 3. Delete Admin:
router.delete(
  '/:id',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(serviceCategoryValidations.deleteServiceCategorySchema),
  serviceController.deleteServiceCategory
)

// 4. Get All Admin :
router.get(
  '/all',
  // auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN, AuthRoles.CUSTOMER, AuthRoles.PROVIDER),
  validateRequest(serviceCategoryValidations.getAllServiceCategoriesSchema),
  serviceController.getAllServiceCategories
)

// 5. Get  Admin :
router.get(
  '/:id',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN, AuthRoles.CUSTOMER, AuthRoles.PROVIDER),
  validateRequest(serviceCategoryValidations.getAllServiceCategoriesSchema),
  serviceController.getServiceCategory
)

export const serviceCategory = router
