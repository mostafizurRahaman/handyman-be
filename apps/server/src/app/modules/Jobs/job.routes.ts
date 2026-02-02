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

export const jobRoutes = router
