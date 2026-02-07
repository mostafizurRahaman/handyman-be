import { AuthRoles, SubscriptionPlan, type IUser } from '@repo/db'
import httpStatus from 'http-status'
import { AppError } from '@repo/shared'

import axios from 'axios'
import configs from '@app/configs'
import type { TInitSubscriptionType } from './subscription.validations'

// 1. Init:
const initSubscription = async (user: IUser, planId: TInitSubscriptionType) => {
  // 1. check is plan exists?:
  const plan = await SubscriptionPlan.findById(planId)
  if (!plan) throw new AppError(httpStatus.NOT_FOUND, 'Subscription plan not found')

  // 2. User should be provider:
  if (user.role !== AuthRoles.PROVIDER) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are not authorized!')
  }

  const { data } = await axios.post(
    'https://api.paystack.co/transaction/initialize',
    {
      email: user.email,
      amount: plan.amount * 100,
      currency: 'NGN',
      plan: plan.payStackPlanCode,
      metadata: {
        user: user._id,
        plan: plan._id,
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

  if (!data.success) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Subscription intitialization failed!')
  }

  return {
    checkoutUrl: data.data.authorization_url,
  }
}

export const subscriptionService = {
  initSubscription,
}
