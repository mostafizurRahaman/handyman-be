import { verifySignatureSimple, verifySignatureV2 } from '@app/libs/didit-helpers'
import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import configs from '@app/configs'

import { verificationServices } from './verification.services'

// 1. Didit webhook Controller:
const diditWebhook = catchAsync(async (req, res) => {
  const signatureV2 = req.get('X-Signature-V2')
  const signatureSimple = req.get('X-Signature-Simple')
  const timestamp = req.get('X-Timestamp')
  const secretKey = configs.diditConfig.diditWebhooKey // Ensure this is in your configs
  const jsonBody = req.body

  if (!timestamp || !secretKey) {
    return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Missing headers or config' })
  }

  let isVerified = false

  if (signatureV2) {
    isVerified = verifySignatureV2(jsonBody, signatureV2, timestamp, secretKey)
  }

  if (!isVerified && signatureSimple) {
    isVerified = verifySignatureSimple(jsonBody, signatureSimple, timestamp, secretKey)
  }

  if (!isVerified) {
    return res.status(httpStatus.UNAUTHORIZED).json({ message: 'Invalid Didit signature' })
  }

  const result = await verificationServices.handleDiditWebhook(jsonBody)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Webhook received and processed: ${result.decision}`,
    data: null,
  })
})

// 2. Didit Session Recall:
const regenerateDiditVerificationUrl = catchAsync(async (req, res) => {
  const email = req.body.email
  const result = await verificationServices.regenerateDiditVerificationUrl(email)
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Regenerate didit verification url!`,
    data: result,
  })
})

export const verificationController = {
  diditWebhook,
  regenerateDiditVerificationUrl,
}
