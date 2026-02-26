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

// 4. Get Provider All Jobs:
router.get(
  '/provider/all',
  auth(AuthRoles.PROVIDER),
  validateRequest(jobValidationSchemas.getProivderAllJobsValidationSchema),
  jobController.getProviderAllJobs
)

// 5. Get Single Job:
router.get(
  '/:id',
  auth(AuthRoles.CUSTOMER, AuthRoles.PROVIDER, AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(jobValidationSchemas.getSingleJobSchema),
  jobController.getJobById
)

// 6. Delete Singe Job:
router.delete(
  '/:id',
  auth(AuthRoles.CUSTOMER),
  validateRequest(jobValidationSchemas.deleteJobSchema),
  jobController.deleteJobById
)

// 7. Update images:
router.patch(
  '/:id/add-image',
  auth(AuthRoles.CUSTOMER),
  validateRequest(jobValidationSchemas.addImageIntoJobSchema),
  jobController.addImageIntoJobById
)

// 8. Remove image from db:
router.delete(
  '/:id/delete-image',
  auth(AuthRoles.CUSTOMER),
  validateRequest(jobValidationSchemas.removeImageFromJobSchema),
  jobController.deleteImageFromJobById
)

// 9. Provider Job Status update:
router.patch(
  '/provider/:id/status',
  auth(AuthRoles.PROVIDER),
  validateRequest(jobValidationSchemas.providerJobStatusUpdateValidationSchema),
  jobController.updateProviderJobStatusById
)

// 10. Provider complete job with attachments:
router.patch(
  '/provider/:id/complete',
  auth(AuthRoles.PROVIDER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('attachments', 5),
  validateRequest(jobValidationSchemas.providerCompleteJobValidationSchema),
  jobController.providerCompleteJob
)

// 11. Customer disputes a job:
router.patch(
  '/customer/:id/dispute',
  auth(AuthRoles.CUSTOMER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('attachments', 5),
  validateRequest(jobValidationSchemas.customerDisputeJobValidationSchema),
  jobController.customerDisputeJob
)

// 12. Customer closes a job:
router.patch(
  '/customer/:id/close',
  auth(AuthRoles.CUSTOMER),
  validateRequest(jobValidationSchemas.customerCloseJobValidationSchema),
  jobController.customerCloseJob
)

// 13. Get Provider nearest all Jobs:
router.get('/provider/nearest', auth(AuthRoles.PROVIDER), jobController.getProviderNearestAllJobs)
export const jobRoutes = router
