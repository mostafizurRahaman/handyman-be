import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import type { Router } from 'express'
import express from 'express'
import { AuthRoles } from 'packages/db/src'
import { disputeValidation } from './dispute.validations'
import { disputeController } from './dispute.controllers'
import { multerFactory } from 'packages/media-hub/src'
const router: Router = express.Router()

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),
  validateRequest(disputeValidation.getAllDispute),
  disputeController.getAllDisputes
)

// submit dispute evedence:
router.patch(
  '/evidence/:id',
  auth(AuthRoles.PROVIDER),
  multerFactory({
    category: 'image',
    maxSizeInMB: 5,
  }).array('image', 5),
  validateRequest(disputeValidation.submitDisputeEvidenceSchema),
  disputeController.submitDisputeEvidence
)

router.post(
  '/:id/resolve',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(disputeValidation.resolveDisputeValidationSchema),
  disputeController.resolveDispute
)

router.get(
  '/:id',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(disputeValidation.getDisputeByID),
  disputeController.getDisputeById
)

export const disputeRoutes = router
