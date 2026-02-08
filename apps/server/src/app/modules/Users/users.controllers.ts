import { catchAsync, sendResponse } from 'packages/shared/src'
import type { TGetAllUserQueryType } from './users.validation'
import httpStatus from 'http-status'
import { userServices } from './users.services'
const getAllUsers = catchAsync(async (req, res) => {
  const query = req.query as unknown as TGetAllUserQueryType

  const result = await userServices.getAllUsers(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `All subscriptions retrived successfullly!`,
    data: result.data,
    meta: result.meta,
  })
})

const getUserById = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const result = await userServices.getSingleUserById(id)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `User fetched successfully!`,
    data: result,
  })
})

const updateUserStatusById = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const body = req.body
  const result = await userServices.updateUserStatusById(id, body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `User status updated successfully!`,
    data: result,
  })
})

export const userControllers = {
  getAllUsers,
  getUserById,
  updateUserStatusById,
}
