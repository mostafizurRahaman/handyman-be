import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { payoutServices } from './payout.services'

const requestPayout = catchAsync(async (req, res) => {
  const result = await payoutServices.requestPayout(req.user, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Payout initiated successfully',
    data: result,
  })
})

export const payoutController = { requestPayout }
