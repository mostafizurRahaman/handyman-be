import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { jobApplicationValidation } from './job-application.validation'
import { jobApplicationControllers } from './job-application.controllers'

const router: Router = express.Router()

router.post(
  '/create',
  auth(AuthRoles.PROVIDER),
  validateRequest(jobApplicationValidation.createJobApplication),
  jobApplicationControllers.createJobApplication
)

router.patch(
  '/update/:id',
  auth(AuthRoles.PROVIDER),
  validateRequest(jobApplicationValidation.updateJobApplication),
  jobApplicationControllers.updateJobApplication
)

router.get(
  '/all',
  //   auth(AuthRoles.PROVIDER),
  //   validateRequest(jobApplicationValidation.updateJobApplication),
  jobApplicationControllers.getAllJobApplications
)

export const jobApplicationRoutes = router
