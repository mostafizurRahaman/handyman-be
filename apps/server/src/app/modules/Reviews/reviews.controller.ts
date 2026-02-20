import { getUserFromRequest } from '@app/libs/get-user-from-request'
import { catchAsync, sendResponse } from 'packages/shared/src'
import httpStatus from 'http-status'
import { reviewService } from './reviews.services'

const createReview = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const body = req.body

  const result = await reviewService.createReview(user, body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Review provided successfully!`,
    data: result,
  })
})

const updateReview = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const body = req.body
  const id = req.params.id as string

  const result = await reviewService.updateReview(user, id, body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Review updated successfully!`,
    data: result,
  })
})

const getReviewById = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const result = await reviewService.getReviewById(id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Review retrived successfully!`,
    data: result,
  })
})

const getAllReviews = catchAsync(async (req, res) => {
  const query = req.query

  const result = await reviewService.getAllReviews(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `All Reviews are retrived successfully!`,
    data: result.data,
    meta: result.meta,
  })
})

export const reviewController = {
  createReview,
  updateReview,
  getReviewById,
  getAllReviews,
}
