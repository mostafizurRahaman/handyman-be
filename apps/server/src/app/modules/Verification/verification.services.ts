/* eslint-disable @typescript-eslint/no-explicit-any */
import { createDiditSession } from '@app/libs/didit-helpers'
import { logger } from '@app/libs/logger'
import {
  AuthRoles,
  AuthStatus,
  User,
  VerificationModel,
  VerificationStatus,
  type TAuthStatus,
} from '@repo/db'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'

// 1. Webhook for didit:
const handleDiditWebhook = async (payload: any) => {
  const { vendor_data, status, decision, session_id } = payload

  // 1. Find the user
  const user = await User.findById(vendor_data)

  if (!user) {
    logger.error('User not found for this account')
    throw new AppError(httpStatus.NOT_FOUND, 'User not found for this verification')
  }

  const identityUpdates: Record<string, unknown> = {
    isDocumentProvided: true,
    isDocumentVerified: status === 'Approved',
  }

  // 2. Determine verification status based on Didit decision
  if (status === 'Approved') {
    if (([AuthStatus.PENDING, AuthStatus.IN_REVIEW] as TAuthStatus[]).includes(user.status)) {
      identityUpdates.status = AuthStatus.ACTIVE
    }
  } else if (status === 'Declined') {
    if (([AuthStatus.ACTIVE, AuthStatus.PENDING] as TAuthStatus[]).includes(user.status)) {
      identityUpdates.status = AuthStatus.IN_REVIEW
    }
  }

  await User.findByIdAndUpdate(user?._id, identityUpdates, {
    new: true,
  })

  await VerificationModel.findOneAndUpdate(
    { user: user._id?.toString() },
    {
      status: status === 'Approved' ? VerificationStatus.VERIFIED : VerificationStatus.DECLINED,
      diditSessionId: session_id,
      rawResponse: payload,
    },
    { upsert: true }
  )
  return { decision }
}

// 2. Regenerate Didit Session:
const regenerateDiditVerificationUrl = async (email: string) => {
  const user = await User.isUserExistByEmail(email)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not exist.')
  }

  if (user.role !== AuthRoles.PROVIDER) {
    throw new AppError(httpStatus.BAD_REQUEST, 'NID verification is required only for providers.')
  }

  if (!user.isOtpVerified || user.status === AuthStatus.PENDING) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Please verify your OTP before proceeding.')
  }

  if (user.status === AuthStatus.ACTIVE) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your account has already been verified.')
  }

  if (user.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.GONE, 'This account has been deleted.')
  }

  if (user.status === AuthStatus.BLOCKED) {
    throw new AppError(httpStatus.FORBIDDEN, 'Your account has been blocked.')
  }

  if (user.isDocumentVerified) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your documents have already been verified.')
  }

  const verification = await VerificationModel.findOne({
    user: user?._id?.toString(),
  })

  if (verification?.status === VerificationStatus.VERIFIED) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Your account is already verified.')
  }

  // Initiate a new Didit session
  const session = await createDiditSession(user)

  // Update or create verification record
  await VerificationModel.findOneAndUpdate(
    { user: user?._id?.toString() },
    {
      diditSessionId: session._id,
      status: VerificationStatus.PENDING,
    },
    {
      new: true,
      upsert: true,
    }
  )

  return {
    url: session.url,
  }
}

export const verificationServices = {
  handleDiditWebhook,
  regenerateDiditVerificationUrl,
}
