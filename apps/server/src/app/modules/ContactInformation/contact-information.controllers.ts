import { catchAsync, sendResponse } from 'packages/shared/src'
import { contactInfoServices } from './contact-information.services'
import { getUserFromRequest } from '@app/libs/get-user-from-request'
import httpStatus from 'http-status'

const updateOrCreateContactInfo = catchAsync(async (req, res) => {
  const payload = req.body
  const user = await getUserFromRequest(req)

  const contactInfo = await contactInfoServices.updateOrCreateContactInformation(user, payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Contact info updated successfully!`,
    data: contactInfo,
  })
})

const getContactInfo = catchAsync(async (req, res) => {
  const contactInfo = await contactInfoServices.getContactInformation()

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Contact info retrived successfully!`,
    data: contactInfo,
  })
})

export const contactInfoController = {
  updateOrCreateContactInfo,
  getContactInfo,
}
