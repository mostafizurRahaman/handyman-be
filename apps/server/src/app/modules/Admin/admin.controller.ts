import { catchAsync, sendResponse } from 'packages/shared/src'
import type { TCreateAdminType } from './admin.validation'
import { AdminServices } from './admin.services'
import httpStatus from 'http-status'

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

export const AdminController = {
  createAdmin,
}
