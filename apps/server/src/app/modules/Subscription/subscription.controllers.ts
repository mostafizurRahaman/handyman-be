import httpStatus from 'http-status'
import { subscriptionService } from './subscription.services'
import { getUserFromRequest } from '@app/libs/get-user-from-request'
import { catchAsync, sendResponse } from '@repo/shared'

// 1. Initialize subscription:
const initSubscription = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const { planId } = req.body

  const result = await subscriptionService.initSubscription(user, planId)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscription initialized successfully!',
    data: result,
  })
})

// 1. Initialize subscription:
const cancelSubscription = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)

  const result = await subscriptionService.cancelSubscription(user)
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Subscription cancelled successfully!',
    data: result,
  })
})

// 3. Get You subscriptoins:
const getMyCurrentSubscription = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)

  const result = await subscriptionService.getCurrentSubscription(user._id?.toString())

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: result ? 'You have an active subscription!' : `You don't have any active subscription`,
    data: result,
  })
})

const getAllSubscriptons = catchAsync(async (req, res) => {
  const result = await subscriptionService.getAllSubscriptions(req.query)
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `All subscriptions retrived successfullly!`,
    data: result.data,
    meta: result.meta,
  })
})

export const subscriptionController = {
  initSubscription,
  cancelSubscription,
  getMyCurrentSubscription,
  getAllSubscriptons,
}
