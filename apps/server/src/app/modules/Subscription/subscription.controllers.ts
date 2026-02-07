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

export const subscriptionController = {
  initSubscription,
}
