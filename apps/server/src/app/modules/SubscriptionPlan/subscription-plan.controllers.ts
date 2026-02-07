import { catchAsync, sendResponse } from 'packages/shared/src'
import httpStatus from 'http-status'
import { subscriptonPlanService } from './subscriptoin-plan.services'
import type { TSubscriptionQuerySchema } from './subscriptoin-plan.validations'

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

// 1. Get subscriptions:
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
export const subscriptonPlanController = {
  createSubcriptionPlan,
  getAllSubscriptionPlans,
}
