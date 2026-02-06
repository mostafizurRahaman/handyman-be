import configs from '@app/configs'
import type { TCreateSubscriptonPlanType } from './subscriptoin-plan.validations'
import axios from 'axios'
import { AppError } from 'packages/shared/src'
import httpStatus from 'http-status'
import { SubscriptionPlan } from 'packages/db/src'
import { logger } from '@app/libs/logger'
const createPlan = async (payload: TCreateSubscriptonPlanType) => {
  const { data } = await axios.post(
    `https://api.paystack.co/plan`,
    { ...payload, currency: 'NGN' },
    {
      headers: {
        Authorization: `Bearer ${configs.payStackConfig.secretKey}`,
        'Content-Type': 'application/json',
      },
    }
  )

  logger.info('Paystack Plan', data)

  if (!data.status) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Paystack plan creation failed!')
  }

  //  Prepare plan to save db:
  const plan = {
    name: data.data.name,
    amount: data.data.amount,
    interval: data.data.interval,
    payStackPlanCode: data.data.plan_code,
    currency: 'NGN',
  }

  logger.info('Paystack Payload', plan)

  const insertedPlan = await SubscriptionPlan.create(plan)

  logger.info('Final Plan', plan)

  return insertedPlan
}

export const subscriptonPlanService = {
  createPlan,
}
