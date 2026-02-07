import configs from '@app/configs'
import type {
  TCreateSubscriptonPlanType,
  TSubscriptionQuerySchema,
} from './subscriptoin-plan.validations'
import axios from 'axios'
import { AppError, QueryBuilder } from 'packages/shared/src'
import httpStatus from 'http-status'
import {
  ChargeType,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  SubscriptionTransaction,
  SubscriptionTransactionStatus,
  User,
} from 'packages/db/src'
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

/**
 *
 * 3. Handle Subscription create :
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleCreateSubscripton = async (data: Record<string, any>) => {
  const {
    subscription_code,
    customer: { customer_code, email },
    plan: { plan_code },
    next_payment_date,
    createdAt,
    email_token,
  } = data

  logger.debug(`INSIDE SUBSCRIPTION`)
  // 1. check user exists:
  const user = await User.isUserExistByEmail(email)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User not found!`)
  }
  logger.info(`User SUBSCRIPTOIN.create : ${user.name} ${user.email}`)

  // 2. Check is plan exists ?:
  const existingPlan = await SubscriptionPlan.findOne({
    payStackPlanCode: plan_code,
  })
  if (!existingPlan) {
    throw new AppError(httpStatus.NOT_FOUND, `Plan doesn't exists!`)
  }
  logger.info(`Plan : ${existingPlan.name}  Amount: ${Number(existingPlan.amount) / 100}`)

  console.log({
    provider: user?._id,
    plan: existingPlan?._id,
    paystackCustomerId: customer_code,
    paystackSubscriptionCode: subscription_code,
    paystackEmailToken: email_token,
    status: SubscriptionStatus.ACTIVE,
    startDate: new Date(createdAt),
    endDate: new Date(next_payment_date),
    nextPaymentDate: new Date(next_payment_date),
  })

  // 3. Update Or Create Subscription:
  const subscription = await Subscription.findOneAndUpdate(
    { provider: user?._id },
    {
      provider: user?._id,
      plan: existingPlan?._id,
      paystackCustomerId: customer_code,
      paystackSubscriptionCode: subscription_code,
      paystackEmailToken: email_token,
      status: SubscriptionStatus.ACTIVE,
      startDate: new Date(createdAt),
      endDate: new Date(next_payment_date),
      nextPaymentDate: new Date(next_payment_date),
    },
    { upsert: true }
  )
  logger.info(`✅ subscription Info`, subscription)
}

/**
 *
 * 3. Handle Charge Success :
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleChargeSuccess = async (data: Record<string, any>) => {
  const {
    customer: { customer_code },
    reference,
    currency,
    amount,
    metadata,
  } = data
  logger.debug(`INSIDE CHARGE`)

  // 1. check user exists:
  const user = await User.findById(metadata.user)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User not found!`)
  }

  logger.info(`User CHARGE: ${user.name} ${user.email}`)

  // 2. Check is plan exists ?:
  const existingPlan = await SubscriptionPlan.findById(metadata.plan)
  if (!existingPlan) {
    throw new AppError(httpStatus.NOT_FOUND, `Plan doesn't exists!`)
  }

  logger.info(`Plan : ${existingPlan.name}  Amount: ${Number(existingPlan.amount) / 100}`)

  logger.info(`✅ Charge Type`, metadata.type)

  if (metadata.type === ChargeType.SUBSCRIPTION) {
    // 3. Update Or Create Subscription:
    const subscription = await Subscription.findOneAndUpdate(
      { provider: user?._id },
      {
        plan: existingPlan?._id,
        paystackCustomerId: customer_code,
      },
      { upsert: true }
    )
    logger.info(`✅ subscription Info`, subscription?.toObject())

    // 4. Create the subscriptions transactions:
    const transaction = await SubscriptionTransaction.create({
      subscription: subscription!._id?.toString(),
      amount: amount / 100,
      currency,
      reference,
      status: SubscriptionTransactionStatus.SUCCESS,
    })

    console.log(
      {
        subscription: subscription!._id?.toString(),
        amount: amount / 100,
        currency,
        reference,
        status: SubscriptionTransactionStatus.SUCCESS,
      },
      {
        plan: existingPlan?._id,
        paystackCustomerId: customer_code,
      }
    )
    logger.info(`✅ subscription Transaction`, transaction?.toObject())
  }
}

// 3. Web hook:
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const webhook = async (body: any) => {
  console.log(body)
  const { event, data } = body

  switch (event) {
    case 'subscription.create':
      await handleCreateSubscripton(data)
      break
    case 'charge.success':
      await handleChargeSuccess(data)
      break
    case 'subscription.disable':
    case 'subscription.not_renew':
      await Subscription.findOneAndUpdate(
        { paystackSubscriptionCode: data.subscription_code },
        { status: SubscriptionStatus.CANCELLED, cancelledAt: new Date(), nextPaymentDate: null }
      )
      break
    case 'invoice.payment_failed': {
      const { amount, currency } = data

      const subscription = await Subscription.findOne({
        paystackSubscriptionCode: data.subscription_code.subscription_code,
      })

      if (subscription) {
        subscription.status = SubscriptionStatus.ATTENTION
        await subscription.save()

        await SubscriptionTransaction.create({
          subscription: subscription._id,
          amount: amount / 100,
          currency,
          reference: data.transaction?.reference || `FAILED_${Date.now()}`,
          status: SubscriptionTransactionStatus.FAILED,
        })

        // console.log(`Notification sent to ${email}: Your payment failed because ${message}`);
      }
      break
    }
    default:
      console.log(`Unhandled Events: `, event)
  }
}
export const subscriptonPlanService = {
  createPlan,
  getAllPlan,
  webhook,
}

/**
 * Senario: 
 */