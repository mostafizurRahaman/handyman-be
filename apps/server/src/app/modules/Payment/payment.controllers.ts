import { catchAsync, sendResponse } from 'packages/shared/src'
import { paymentServices } from './payment.services'

import httpStatus from 'http-status'
import type { IGetAllPaymentsQuery } from './payment.validations'

// 1. Get All Payments (Admin)
const getAllPayments = catchAsync(async (req, res) => {
  const query = req.query as unknown as IGetAllPaymentsQuery

  const payments = await paymentServices.getAllPayments(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Payments retrieved successfully',
    data: payments,
  })
})

export const paymentControllers = {
  getAllPayments,
}
