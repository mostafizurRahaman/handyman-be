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

// 2. Job updated successfully:
router.patch(
  '/:id',
  auth(AuthRoles.CUSTOMER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('images', 5),
  validateRequest(jobValidationSchemas.updateJobSchema),
  jobController.updateJobById
)

// 3. Get all jobs:
router.get(
  '/customer/all',
  auth(AuthRoles.CUSTOMER),
  validateRequest(jobValidationSchemas.getCustomerAllJobs),
  jobController.getAllCustomerJobs
)

// 3. Get Provider All Jobs:
router.get(
  '/provider/all',
  auth(AuthRoles.PROVIDER),
  validateRequest(jobValidationSchemas.getProivderAllJobsValidationSchema),
  jobController.getProviderAllJobs
)

// 4. Get Single Job:
router.get(
  '/:id',
  auth(AuthRoles.CUSTOMER, AuthRoles.PROVIDER, AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(jobValidationSchemas.getSingleJobSchema),
  jobController.getJobById
)

// 5. Delete Singe Job:
router.delete(
  '/:id',
  auth(AuthRoles.CUSTOMER),
  validateRequest(jobValidationSchemas.deleteJobSchema),
  jobController.deleteJobById
)

// 6. Update images:
router.patch(
  '/:id/add-image',
  auth(AuthRoles.CUSTOMER),
  validateRequest(jobValidationSchemas.addImageIntoJobSchema),
  jobController.addImageIntoJobById
)

// 7. Remove image from db:
router.delete(
  '/:id/delete-image',
  auth(AuthRoles.CUSTOMER),
  validateRequest(jobValidationSchemas.removeImageFromJobSchema),
  jobController.deleteImageFromJobById
)

// 8. Provider Job Status update:
router.patch(
  '/provider/:id/status',
  auth(AuthRoles.PROVIDER),
  validateRequest(jobValidationSchemas.providerJobStatusUpdateValidationSchema),
  jobController.updateProviderJobStatusById
)

export const jobRoutes = router
