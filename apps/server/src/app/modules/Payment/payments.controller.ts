import httpStatus from 'http-status'
import { catchAsync, sendResponse } from 'packages/shared/src'
import { paymentServices } from './payment.services'
import type { IGetAllPaymentsQuery } from './payment.validations'

// Get all payments :
const getAllPayments = catchAsync(async (req, res) => {
  const result = await paymentServices.getAllPayments(req.query as IGetAllPaymentsQuery)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Get all payments successfully!`,
    data: result.data,
    meta: result.meta,
  })
})

// Get single payment by id :
const getSinglePaymentById = catchAsync(async (req, res) => {
  const result = await paymentServices.getSinglePayment(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Payment retrieved successfully!`,
    data: result.data,
  })
})

const getEarningSummary = catchAsync(async (req, res) => {
  const result = await paymentServices.getEarningSummary()

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Earning summary retrieved successfully!`,
    data: result,
  })
})

export const paymentController = {
  getAllPayments,
  getSinglePaymentById,
  getEarningSummary,
}
