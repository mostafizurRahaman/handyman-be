import { validateRequest } from '@app/middlewares'
import express, { Router } from 'express'
import { jobValidationSchemas } from './job.validations'
import { jobController } from './job.controllers'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'
import { multerFactory } from 'packages/media-hub/src'

const router: Router = express()

// 1. Job created successfully:
router.post(
  '/create',
  auth(AuthRoles.CUSTOMER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('images', 5),
  validateRequest(jobValidationSchemas.createJobSchema),
  jobController.createJob
)

// 3. Get all jobs:
router.get(
  '/all',
  auth(AuthRoles.CUSTOMER),
  validateRequest(jobValidationSchemas.getCustomerAllJobs),
  jobController.getAllCustomerJobs
)

// 3. Job created successfully:
router.get(
  '/:id',
  auth(AuthRoles.CUSTOMER, AuthRoles.PROVIDER, AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(jobValidationSchemas.getSingleJobSchema),
  jobController.getJobById
)

export const jobRoutes = router
