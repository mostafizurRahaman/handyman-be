import { catchAsync, sendResponse } from '@repo/shared'
import httpStatus from 'http-status'
import { providerServices } from './provider.services'

const getProviderDetailsById = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const result = await providerServices.getProviderDetailsById(id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Provider profile retrieved successfully!`,
    data: result,
  })
})

export const providerController = {
  getProviderDetailsById,
}
