import { catchAsync, sendResponse } from 'packages/shared/src'
import { jobServices } from './jobs.services'
import httpStatus from 'http-status'
import { getUserFromRequest } from '@app/libs/get-user-from-request'
import { JobStatus } from 'packages/db/src'
import type { TGetAllJobsQueryType } from './job.validations'

// 1. Create Job:
const createJob = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
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
  const user = await getUserFromRequest(req)

  const result = await jobServices.updateJob(user, id, body, files)

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
  const user = await getUserFromRequest(req)
  const result = await jobServices.getCustomAllJobs(user, query)

  sendResponse(res, {
    success: true,
    message: `Your jobs retrived successfully!`,
    statusCode: httpStatus.OK,
    data: result.data,
    meta: result.meta,
  })
})

// 4. Get Job:
const getJobById = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const user = await getUserFromRequest(req)

  const result = await jobServices.getJobById(user, id)

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
  const user = await getUserFromRequest(req)
  const result = await jobServices.deleteJobById(user, id)

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
  const user = await getUserFromRequest(req)
  const result = await jobServices.deleteImageFromJobById(user, id, imageUrl)

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
  const user = await getUserFromRequest(req)
  const result = await jobServices.addImageIntoJobById(user, id, files)

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
  const user = await getUserFromRequest(req)
  const result = await jobServices.getProivderAllJobs(user, query)

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
  const result = await jobServices.updateProviderJobStatusById(user, id, body)

  sendResponse(res, {
    success: true,
    message: `Provider has ${body.status === JobStatus.ENROUTE ? 'started heading to the job location' : 'started the job'} successfully!`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

// 10. Provider Complete Job:
const providerCompleteJob = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const body = req.body
  const files = req.files as Express.Multer.File[]
  const user = await getUserFromRequest(req)

  const result = await jobServices.providerCompleteJob(user, id, body, files)

  sendResponse(res, {
    success: true,
    message: `Job marked as completed successfully!`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

// 11. Customer disputes a job:
const customerDisputeJob = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const body = req.body
  const files = req.files as Express.Multer.File[]
  const user = await getUserFromRequest(req)

  const result = await jobServices.customerDisputeJob(user, id, body, files)

  sendResponse(res, {
    success: true,
    message: `Dispute raised successfully! Admin will review shortly.`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

// 12. Customer closes a job after reviewing provider's completion:
const customerCloseJob = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const user = await getUserFromRequest(req)

  const result = await jobServices.customerCloseJob(user, id)

  sendResponse(res, {
    success: true,
    message: `Job closed successfully! Payment released to provider.`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

// 13. Get Provider Nearest All Jobs:
const getProviderNearestAllJobs = catchAsync(async (req, res) => {
  const user = await getUserFromRequest(req)
  const result = await jobServices.getProvierNearestJobs(user)

  sendResponse(res, {
    success: true,
    message: `Your jobs retrived successfully!`,
    statusCode: httpStatus.OK,
    data: result,
  })
})

// 14. Get all jobs:
const getAllJobs = catchAsync(async (req, res) => {
  const query = req.query as unknown as TGetAllJobsQueryType
  const result = await jobServices.getAllJobs(query)

  sendResponse(res, {
    success: true,
    message: `All jobs retrived successfully!`,
    statusCode: httpStatus.OK,
    data: result.data,
    meta: result.meta,
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
  providerCompleteJob,
  customerDisputeJob,
  customerCloseJob,
  getProviderNearestAllJobs,
  getAllJobs,
}
