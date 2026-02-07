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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Failed to cancel subscription!')
  }
}

// subscription.services.ts

const getCurrentSubscription = async (userId: string) => {
  const subscription = await Subscription.findOne({ provider: userId }).populate('plan').lean()

  if (!subscription) {
    return null
  }

  const today = new Date()
  const endDate = subscription.endDate ? new Date(subscription.endDate) : null

  // ১. যদি স্ট্যাটাস ACTIVE হয়, তবে অবশ্যই রিটার্ন করবে
  if (subscription.status === SubscriptionStatus.ACTIVE) {
    return { ...subscription, buttonText: `Cancel Subscription`, action: 'CANCEL', }
  }

  // ২. যদি স্ট্যাটাস CANCELLED বা NON_RENEWING হয়:
  // চেক করবে মেয়াদ (nextPaymentDate) শেষ হয়েছে কি না
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
      // মেয়াদ শেষ হয়ে গেছে
      return null
    }
  }

  // ৩. যদি ATTENTION হয় (পেমেন্ট ফেইল), আমরা চাইলে রিটার্ন করতে পারি (যাতে ইউজার রিনিউ করার সুযোগ পায়)
  if (subscription.status === SubscriptionStatus.ATTENTION) {
    return {
      ...subscription,
      buttonText: 'Update Payment / Retry',
      action: 'UPDATE_PAYMENT',
    }
  }

  return null
}

export const subscriptionService = {
  initSubscription,
  cancelSubscription,
  getCurrentSubscription,
}
