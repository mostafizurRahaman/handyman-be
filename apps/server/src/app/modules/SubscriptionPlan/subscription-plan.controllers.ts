import { AppError, catchAsync, sendResponse } from 'packages/shared/src'
import httpStatus from 'http-status'
import { subscriptonPlanService } from './subscriptoin-plan.services'
import type { TSubscriptionQuerySchema } from './subscriptoin-plan.validations'
import configs from '@app/configs'
import crypto from 'node:crypto'
import { logger } from '@app/libs/logger'

// 1. Create subscription:
const createSubcriptionPlan = catchAsync(async (req, res) => {
  const payload = req.body

  const result = await subscriptonPlanService.createPlan(payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Subscription Plan created successfully!`,
    data: result,
  })
})

// 2. Get subscriptions:
const getAllSubscriptionPlans = catchAsync(async (req, res) => {
  const query = req.query as TSubscriptionQuerySchema

  const result = await subscriptonPlanService.getAllPlan(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Subscription Plans retrieved successfully!`,
    data: result.data,
    meta: result.meta,
  })
})

// 3. Subscription Webhook:
const subscriptionWebhook = catchAsync(async (req, res) => {
  const hash = crypto
    .createHmac('sha512', configs.payStackConfig.secretKey)
    .update(JSON.stringify(req.body))
    .digest('hex')
  if (hash !== req.headers['x-paystack-signature']) {
    throw new AppError(httpStatus.BAD_REQUEST, `Invalid Signature!`)
  }

  const event = req.body
  logger.info('Subscription events', event)

  res.send(200)
})

export const subscriptonPlanController = {
  createSubcriptionPlan,
  getAllSubscriptionPlans,
  subscriptionWebhook,
}
