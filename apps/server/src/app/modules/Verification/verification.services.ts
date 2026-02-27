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
import type { IGetAllVerificationQuery } from './verification.validation'
import type { PipelineStage } from 'mongoose'

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

// 3. Get all verification summary:
const getAllVerfications = async (query: IGetAllVerificationQuery) => {
  const {
    fromDate,
    toDate,
    limit = 10,
    page = 1,
    searchTerm,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
  } = query
  const searchableFields = ['providerEmail', 'providerName']

  const sortableFields = ['status', 'createdAt', 'providerName', 'confidenceScore']

  const skip = (Number(page) - 1) * Number(limit)

  if (sortBy && !sortableFields?.includes(sortBy)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You can sort by using this fields only: ${sortableFields.join(',')}`
    )
  }

  const pipeline: PipelineStage[] = []

  //  status filter:
  if (status) {
    pipeline.push({
      $match: {
        status,
      },
    })
  }

  // date filter:
  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) {
      dateFilter.$gte = new Date(fromDate)
    }
    if (toDate) {
      dateFilter.$lte = new Date(toDate)
    }

    pipeline.push({
      $match: {
        createdAt: dateFilter,
      },
    })
  }

  // Lookup cusotmer details:
  pipeline.push({
    $lookup: {
      from: 'users',
      let: {
        verificationUserId: '$user',
      },
      as: 'providerDetails',
      pipeline: [
        {
          $match: {
            $expr: {
              $eq: [{ $toString: '$_id' }, '$$verificationUserId'],
            },
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            phoneNumber: 1,
            profileImage: 1,
          },
        },
      ],
    },
  })

  // Unwind :
  pipeline.push({
    $unwind: {
      path: '$providerDetails',
      preserveNullAndEmptyArrays: true,
    },
  })

  // add few fields :
  pipeline.push({
    $addFields: {
      // provider
      providerId: '$providerDetails._id',
      providerName: '$providerDetails.name',
      providerEmail: '$providerDetails.email',
      providerPhoneNumber: '$providerDetails.phoneNumber',
      providerProfileImage: '$providerDetails.profileImage',
    },
  })

  //  Project:
  pipeline.push({
    $project: {
      providerDetails: 0,
      rawResponse: 0,
      __v: 0,
    },
  })

  // searchable fields :

  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: searchableFields.map((field) => ({
          [field]: {
            $regex: searchTerm,
            $options: 'i',
          },
        })),
      },
    })
  }

  // sort :
  pipeline.push({
    $sort: {
      [sortBy]: sortOrder === 'asc' ? 1 : -1,
    },
  })

  // seperate pagination count and skip :
  pipeline.push({
    $facet: {
      data: [
        {
          $skip: skip,
        },
        {
          $limit: Number(limit),
        },
      ],
      meta: [
        {
          $count: 'total',
        },
      ],
    },
  })

  const result = await VerificationModel.aggregate(pipeline)

  const data = result[0].data
  const total = result[0].meta?.[0]?.total || 0
  const totalPages = Math.ceil(total / Number(limit))

  return {
    data: data,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
    },
  }
}

export const verificationServices = {
  handleDiditWebhook,
  regenerateDiditVerificationUrl,
  getAllVerfications,
}
