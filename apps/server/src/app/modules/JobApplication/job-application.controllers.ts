import { catchAsync, sendResponse } from 'packages/shared/src'
import httpStatus from 'http-status'
import { JobApplicationServices } from './job-application.services'
import { getUserFromRequest } from '@app/libs/get-user-from-request'

// 1. Create Job Application
const createJobApplication = catchAsync(async (req, res) => {
  const payload = req.body
  const user = req.user

  const result = await JobApplicationServices.createJobApplication(user, payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: `Job application submitted successfully!`,
    data: result,
  })
})

// 2. Update Job Application
const updateJobApplication = catchAsync(async (req, res) => {
  const payload = req.body
  const id = req.params.id as string
  const user = req.user

  const result = await JobApplicationServices.updateTheApplications(id, user, payload)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Job application updated successfully!`,
    data: result,
  })
})

// 3. Get all job application:
const getAllJobApplications = catchAsync(async (req, res) => {
  const result = await JobApplicationServices.getAllJobApplications(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Job application updated successfully!`,
    data: result.data,
    meta: result.meta,
  })
})

// 4. Accept Job application params link:
const acceptJobApplication = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const user = await getUserFromRequest(req)

  const result = await JobApplicationServices.acceptJobApplicationById(user, id)
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: `Job application accepted successfully! Please pay now!`,
    data: result,
  })
})

export const jobApplicationControllers = {
  createJobApplication,
  updateJobApplication,
  getAllJobApplications,
  acceptJobApplication,
}
