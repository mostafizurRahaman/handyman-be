import { catchAsync, sendResponse } from 'packages/shared/src'
import type { TCreateAdminType } from './admin.validation'
import { AdminServices } from './admin.services'
import httpStatus from 'http-status'
import { logger } from '@app/libs/logger'

const createAdmin = catchAsync(async (req, res) => {
  const profileImage = req.file as Express.Multer.File
  const body = req.body as TCreateAdminType

  const result = await AdminServices.createAdmin(profileImage, body)

  sendResponse(res, {
    data: result,
    message: 'Admin created successfully',
    statusCode: httpStatus.CREATED,
    success: true,
  })
})

const updateAdmin = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const profileImage = req.file as Express.Multer.File
  const body = req.body as TCreateAdminType

  const result = await AdminServices.updateAdmin(id, profileImage, body)

  sendResponse(res, {
    data: result,
    message: 'Admin updated successfully',
    statusCode: httpStatus.OK,
    success: true,
  })
})
const deleteAdmin = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const result = await AdminServices.deleteAdmin(id)

  sendResponse(res, {
    data: result,
    message: 'Admin deleted successfully',
    statusCode: httpStatus.OK,
    success: true,
  })
})

const getAdmin = catchAsync(async (req, res) => {
  const id = req.params.id as string
  logger.info(id)

  const result = await AdminServices.getAdminById(id)

  sendResponse(res, {
    data: result,
    message: 'Admin retrived successfully',
    statusCode: httpStatus.OK,
    success: true,
  })
})

export const AdminController = {
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAdmin
}
