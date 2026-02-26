import { catchAsync, sendResponse } from 'packages/shared/src'
import { paymentServices } from './payment.services'
import type { TGetAllPayments } from './payment.validations'
import httpStatus from 'http-status'

// 1. Get All Payments (Admin)
const getAllPayments = catchAsync(async (req, res) => {
  const query = req.query as unknown as TGetAllPayments

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
