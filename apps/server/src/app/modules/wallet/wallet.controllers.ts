import { getUserFromRequest } from '@app/libs/get-user-from-request'
import { catchAsync, sendResponse } from '@repo/shared'
import { walletServices } from './wallet.services'
import httpStatus from 'http-status'

// Get wallet:
const getWallet = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)

  const result = await walletServices.getMyWallet(user)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `You wallet retrived successfully`,
    data: result,
  })
})

export const walletController = {
  getWallet,
}
