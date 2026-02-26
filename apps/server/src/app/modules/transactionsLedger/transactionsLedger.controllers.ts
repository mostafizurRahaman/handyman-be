import { catchAsync, sendResponse } from 'packages/shared/src'
import httpStatus from 'http-status'
import { transactionLedgerServices } from './transactionLeger.services'
import type { IGetAllTransactionLedgers } from './transactionLedger.validations'

const getAllTransactions = catchAsync(async (req, res) => {
  const query = req.query as IGetAllTransactionLedgers

  const result = await transactionLedgerServices.getAllTransactions(query)
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Transactions retrived successfully!`,
    data: result,
  })
})

export const transactionController = {
  getAllTransactions,
}
