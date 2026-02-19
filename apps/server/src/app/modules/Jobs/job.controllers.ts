import { catchAsync, sendResponse } from 'packages/shared/src'
import { jobServices } from './jobs.services'
import httpStatus from 'http-status'
import { getUserFromRequest } from '@app/libs/get-user-from-request'

// 1. Create Job:
const createJob = catchAsync(async (req, res) => {
  const user = req.user
  const payload = req.body
  const files = req.files as Express.Multer.File[]

  const result = await jobServices.createJob(user, payload, files)

  sendResponse(res, {
    success: true,
    message: `Job created successfully!`,
    statusCode: httpStatus.CREATED,
    data: result,
  })
})

// 2. Update Job:
const updateJobById = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const body = req.body
  const files = req.files as Express.Multer.File[]

  const result = await jobServices.updateJob(req.user, id, body, files)

  sendResponse(res, {
    success: true,
    message: `Job updated successfully!`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

// 3. Get all jobs:
const getAllCustomerJobs = catchAsync(async (req, res) => {
  const query = req.query
  const result = await jobServices.getCustomAllJobs(req.user, query)

  sendResponse(res, {
    success: true,
    message: `Your jobs retrived successfully!`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

// 4. Get Job:
const getJobById = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const result = await jobServices.getJobById(id)

  sendResponse(res, {
    success: true,
    message: `Job retrived successfully!`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

// 5. Delete Job:
const deleteJobById = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const result = await jobServices.deleteJobById(req.user, id)

  sendResponse(res, {
    success: true,
    message: `Job deleted successfully!`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

// 6. Delete Image From Job:
const deleteImageFromJobById = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const imageUrl = req.body.imageUrl

  const result = await jobServices.deleteImageFromJobById(req.user, id, imageUrl)

  sendResponse(res, {
    success: true,
    message: `Image deleted from job successfully!`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

// 7. Add new image into job:
const addImageIntoJobById = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const files = req.files as Express.Multer.File[]

  const result = await jobServices.addImageIntoJobById(req.user, id, files)

  sendResponse(res, {
    success: true,
    message: `New image uploaded successfully!`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

// 8. Get all jobs:
const getProviderAllJobs = catchAsync(async (req, res) => {
  const query = req.query
  const result = await jobServices.getProivderAllJobs(req.user, query)

  sendResponse(res, {
    success: true,
    message: `Your jobs retrived successfully!`,
    statusCode: httpStatus.OK,
    data: result.data,
    meta: result.meta,
  })
})

// 9. Update provider job status by id: (After assigned only)
const updateProviderJobStatusById = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const body = req.body
  const user = await getUserFromRequest(req)
  const result = await jobServices.updateProividerJobStatusById(user, id, body)

  sendResponse(res, {
    success: true,
    message: `Provider Job Status updated successfully!`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

export const jobController = {
  createJob,
  updateJobById,
  getJobById,
  deleteJobById,
  getAllCustomerJobs,
  deleteImageFromJobById,
  addImageIntoJobById,
  getProviderAllJobs,
  updateProviderJobStatusById,
}
