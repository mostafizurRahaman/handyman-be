import { catchAsync, sendResponse } from 'packages/shared/src'
import { jobServices } from './jobs.services'
import httpStatus from 'http-status'

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

// 2. Get Job:
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

export const jobController = {
  createJob,
  getJobById,
}
