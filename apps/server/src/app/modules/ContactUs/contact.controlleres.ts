import { catchAsync, sendResponse } from '@repo/shared'
import { contactServices } from './contact.services'
import httpStatus from 'http-status'
import type { TGetAllContactQuery } from './contact.validations'

const createContact = catchAsync(async (req, res) => {
  const payload = req.body

  const contact = await contactServices.createContact(payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Your message submitted successfully!`,
    data: contact,
  })
})

const getAllContacts = catchAsync(async (req, res) => {
  const query = req.query as unknown as TGetAllContactQuery

  const result = await contactServices.getAllContacts(query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `All messages retrived successfully=!`,
    data: result.data,
    meta: result.meta,
  })
})

export const contactController = {
  createContact,
  getAllContacts,
}
