import {
  AuthRoles,
  ChargeType,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  type IUser,
} from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'

import axios from 'axios'
import configs from '@app/configs'
import type {
  TGetAllSubscriptionsQueryType,
  TInitSubscriptionType,
} from './subscription.validations'
import { logger } from '@app/libs/logger'
import type { PipelineStage } from 'mongoose'

// 1. Init:
const initSubscription = async (user: IUser, planId: TInitSubscriptionType) => {
  // 1. check is plan exists?:
  const plan = await SubscriptionPlan.findById(planId)
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found')

  // 2. User should be provider:
  if (user.role !== AuthRoles.PROVIDER) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized!')
  }

  try {
    const res = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount: plan.amount * 100,
        currency: 'NGN',
        plan: plan.payStackPlanCode,
        metadata: {
          user: user._id.toString(),
          plan: plan._id.toString(),
          type: ChargeType.SUBSCRIPTION,
        },
        callback_url: configs.payStackConfig.successUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${configs.payStackConfig.secretKey}`,
          'Content-type': 'application/json',
        },
      }
    )

    // Log only safe data
    logger.info('Paystack response data', res.data)
    logger.info('Paystack response status', res.status)

    if (!res.data?.status) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Subscription initialization failed!')
    }

    return {
      checkoutUrl: res.data.data.authorization_url,
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    logger.error('Paystack initialization error', error.message)
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to initialize subscription')
  }
}

// 2. Disabled subscription :
const cancelSubscription = async (user: IUser) => {
  const subscription = await Subscription.findOne({ provider: user._id })

  if (!subscription || subscription.status === SubscriptionStatus.CANCELLED) {
    throw new AppError(httpStatus.BAD_REQUEST, 'No active subscripton exists!')
  }

  try {
    await axios.post(
      'https://api.paystack.co/subscription/disable',
      {
        code: subscription.paystackSubscriptionCode,
        token: subscription.paystackEmailToken,
      },
      {
        headers: {
          Authorization: `Bearer ${configs.payStackConfig.secretKey}`,
          'Content-type': 'application/json',
        },
      }
    )

    // update status:
    subscription.status = SubscriptionStatus.CANCELLED
    subscription.cancelledAt = new Date()
    await subscription.save()

    return subscription

    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, no-unused-vars
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to cancel subscription!')
  }
}

// 3. subscription.services.ts
const getCurrentSubscription = async (userId: string) => {
  const subscription = await Subscription.findOne({ provider: userId }).populate('plan').lean()

  if (!subscription) {
    return null
  }

  const today = new Date()
  const endDate = subscription.endDate ? new Date(subscription.endDate) : null

  if (subscription.status === SubscriptionStatus.ACTIVE) {
    return { ...subscription, buttonText: `Cancel Subscription`, action: 'CANCEL' }
  }

  if (
    subscription.status === SubscriptionStatus.CANCELLED ||
    subscription.status === SubscriptionStatus.NON_RENEWING
  ) {
    if (endDate && today <= endDate) {
      return {
        ...subscription,
        buttonText: 'Reactivate Subscription',
        action: 'REACTIVATE',
      }
    } else {
      return null
    }
  }

  if (subscription.status === SubscriptionStatus.ATTENTION) {
    return null
  }

  return null
}

// 4. Get all subscriptions:
const getAllSubscriptions = async (query: TGetAllSubscriptionsQueryType) => {
  const {
    limit = 10,
    page = 1,
    searchTerm,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
    fromDate,
    toDate,
  } = query

  const skip = (Number(page) - 1) * Number(limit)

  const allowedSortFields = ['subscribedAt', 'expiresAt', 'nextPaymentDate', 'status', 'createdAt']

  if (!allowedSortFields.includes(sortBy)) {
    throw new AppError(400, 'Invalid sort field')
  }

  const searchableFields = ['providerName', 'providerEmail', 'planName', 'interval']

  const pipeline: PipelineStage[] = [
    // 1. Lookup plan
    {
      $lookup: {
        from: 'subscriptionplans',
        localField: 'plan',
        foreignField: '_id',
        as: 'planDetails',
      },
    },
    { $unwind: '$planDetails' },

    // 2. Lookup provider
    {
      $lookup: {
        from: 'users',
        localField: 'provider',
        foreignField: '_id',
        as: 'providerDetails',
      },
    },
    { $unwind: '$providerDetails' },

    ...(status ? [{ $match: { status } }] : []),
  ]

  // 4. Projection
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

  // 4. Projection
  pipeline.push({
    $project: {
      _id: 1,
      providerId: '$provider',
      providerName: '$providerDetails.name',
      providerEmail: '$providerDetails.email',
      profileImg: '$providerDetails.profileImage',

      planId: '$plan',
      planName: '$planDetails.name',
      interval: '$planDetails.interval',
      amount: '$planDetails.amount',
      currency: '$planDetails.currency',

      createdAt: 1,
      subscribedAt: '$startDate',
      expiresAt: '$endDate',
      cancelledAt: '$cancelledAt',
      nextPaymentDate: '$nextPaymentDate',
      status: 1,
    },
  })
  // 5. Search
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: searchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  // 6. Pagination + meta
  pipeline.push({
    $facet: {
      data: [
        {
          $sort: {
            [sortBy]: sortOrder === 'asc' ? 1 : -1,
          },
        },
        { $skip: skip },
        { $limit: Number(limit) },
      ],
      meta: [{ $count: 'total' }],
    },
  })

  // 7. DateFilter:

  const [result] = await Subscription.aggregate(pipeline)

  const total = result.meta[0]?.total || 0

  return {
    data: result.data,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  }
}

export const subscriptionService = {
  initSubscription,
  cancelSubscription,
  getCurrentSubscription,
  getAllSubscriptions,
}
