import { catchAsync, sendResponse } from 'packages/shared/src'
import httpStatus from 'http-status'
import { subscriptonPlanService } from './subscriptoin-plan.services'

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

export const subscriptonPlanController = {
  createSubcriptionPlan,
}
