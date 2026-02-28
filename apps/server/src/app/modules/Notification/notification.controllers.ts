import { getUserFromRequest } from '@app/libs/get-user-from-request'
import { catchAsync, sendResponse } from '@repo/shared'

import { notificationServices } from './notification.services'
import httpStatus from 'http-status'

const registerToken = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)

  const result = await notificationServices.registerToken(user, req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Device token registered successfully',
    data: result,
  })
})

export const notificationControllers = {
  registerToken,
}
