import configs from '@app/configs'
import type {
  TCreateSubscriptonPlanType,
  TSubscriptionQuerySchema,
} from './subscriptoin-plan.validations'
import axios from 'axios'
import { AppError, QueryBuilder } from 'packages/shared/src'
import httpStatus from 'http-status'
import { SubscriptionPlan } from 'packages/db/src'
import { logger } from '@app/libs/logger'

// 1. Create a plan:
const createPlan = async (payload: TCreateSubscriptonPlanType) => {
  try {
    const { data } = await axios.post(
      `https://api.paystack.co/plan`,
      { ...payload, amount: payload.amount * 100, currency: 'NGN' },
      {
        headers: {
          Authorization: `Bearer ${configs.payStackConfig.secretKey}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!data.status) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Paystack plan creation failed!')
    }

    //  Prepare plan to save db:
    const plan = {
      name: data.data.name,
      amount: data.data.amount / 100,
      interval: data.data.interval,
      payStackPlanCode: data.data.plan_code,
      currency: 'NGN',
    }

    const insertedPlan = await SubscriptionPlan.create(plan)

    return insertedPlan
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      logger.error('Axios error', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      })

      throw new AppError(
        httpStatus.BAD_REQUEST,
        error.response?.data?.message || 'Payment gateway error'
      )
    }

    logger.error('Unknown error', { message: error.message })
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Internal server error')
  }
}

// 2. Get all plan:
const getAllPlan = async (query: TSubscriptionQuerySchema) => {
  const searableFields = ['name']

  const planQuery = new QueryBuilder(SubscriptionPlan.find({}), query)
    .search(searableFields)
    .filter()
    .sort()
    .paginate()
    .fields()

  const data = await planQuery.modelQuery
  const meta = await planQuery.countTotal()

  return {
    data,
    meta,
  }
}

export const subscriptonPlanService = {
  createPlan,
  getAllPlan,
}
