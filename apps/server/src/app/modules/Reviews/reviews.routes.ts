import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { reviewValidations } from './reviews.validations'
import { reviewController } from './reviews.controller'

const router: Router = express.Router()

router.post(
  '/add',
  auth(AuthRoles.CUSTOMER),
  validateRequest(reviewValidations.createReviewValidationSchema),
  reviewController.createReview
)

router.patch(
  '/:id',
  auth(AuthRoles.CUSTOMER),
  validateRequest(reviewValidations.updateReviewValidationSchema),
  reviewController.updateReview
)

router.get(
  '/all',
  auth(AuthRoles.CUSTOMER, AuthRoles.PROVIDER, AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(reviewValidations.getAllReivews),
  reviewController.getAllReviews
)

router.get(
  '/:id',
  auth(AuthRoles.CUSTOMER, AuthRoles.PROVIDER, AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(reviewValidations.getReviewById),
  reviewController.getReviewById
)

export const reviewRoutes = router
