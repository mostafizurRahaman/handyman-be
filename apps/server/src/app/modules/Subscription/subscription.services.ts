import { AuthRoles, ChargeType, SubscriptionPlan, type IUser } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'

import axios from 'axios'
import configs from '@app/configs'
import type { TInitSubscriptionType } from './subscription.validations'
import { logger } from '@app/libs/logger'

// 1. Init:
const initSubscription = async (user: IUser, planId: TInitSubscriptionType) => {
  // 1. check is plan exists?:
  const plan = await SubscriptionPlan.findById(planId)
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found')

  logger.info('user', user)

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

export const subscriptionService = {
  initSubscription,
}
