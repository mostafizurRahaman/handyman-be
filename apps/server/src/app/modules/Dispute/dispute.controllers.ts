import { getUserFromRequest } from '@app/libs/get-user-from-request'
import { catchAsync, sendResponse } from '@repo/shared'
import { disputeServices } from './dispute.services'
import httpStatus from 'http-status'
import type { TGetAllDisputeQueryType } from './dispute.validations'
// ** Submit Dispute Evidence:
const submitDisputeEvidence = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const files = req.files as Express.Multer.File[]
  const id = req.params.id as string
  const result = await disputeServices.submitDisputeEvidence(user, id, files)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Dispute evidence submitted successfully!',
    data: result,
  })
})

const resolveDispute = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await disputeServices.resolveDispute(
    user._id.toString(),
    req.params.id as string,
    req.body
  )

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Dispute resolved successfully!',
    data: result,
  })
})

const getAllDisputes = catchAsync(async (req, res) => {
  const result = await disputeServices.getAllDisputes(req.query as TGetAllDisputeQueryType)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Disputes retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

const getDisputeById = catchAsync(async (req, res) => {
  const result = await disputeServices.getDisputeById(req.params.id as string)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: 'Dispute retrieved successfully!',
    data: result,
  })
})

export const disputeController = {
  submitDisputeEvidence,
  resolveDispute,
  getDisputeById,
  getAllDisputes,
}
