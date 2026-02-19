import express, { Router } from 'express'
import { verificationController } from './verification.controllers'
import { validateRequest } from '@app/middlewares'
import { verificationValidations } from './verification.validation'

const router: Router = express.Router()

// 1. Verify Documents Hook:
/**
 * @desc Webhook for Didit NID Verification
 * This route is public as it's called by Didit's servers.
 * Security is handled via HMAC Signature verification in the controller.
 */
router.post('/didit-webhook', verificationController.diditWebhook)

// 2. Regenerate Verification url:
router.post(
  '/again',
  validateRequest(verificationValidations.regenerateVerificatinUrlSchema),
  verificationController.regenerateDiditVerificationUrl
)

export const verificationRoutes = router
