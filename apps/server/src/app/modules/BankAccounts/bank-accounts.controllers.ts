import { catchAsync, sendResponse } from 'packages/shared/src'
import { bankAccountServices } from './bank-accounts.services'
import httpStatus from 'http-status'
import { getUserFromRequest } from '@app/libs/get-user-from-request'

// Get all bank codes :
const getBankCodes = catchAsync(async (req, res) => {
  const bankCodes = await bankAccountServices.getBankCodes()

  sendResponse(res, {
    success: true,
    message: `Bank Codes retrived successfully!`,
    statusCode: httpStatus.OK,
    data: bankCodes.data,
    meta: {
      limit: bankCodes?.data?.length,
      page: 1,
      total: bankCodes?.data?.length,
      totalPages: 1,
    },
  })
})

// Add Bank Accounts:
const addBankAccount = catchAsync(async (req, res) => {
  const body = req.body
  const user = await getUserFromRequest(req)
  const account = await bankAccountServices.addBankAccount(user, body)

  sendResponse(res, {
    success: true,
    message: `Bank account linked successfully!`,
    statusCode: httpStatus.OK,
    data: account,
  })
})

export const bankAcccountControllers = {
  getBankCodes,
  addBankAccount,
}
