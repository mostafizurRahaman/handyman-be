import { catchAsync, sendResponse } from 'packages/shared/src'
import { jobServices } from './jobs.services'
import httpStatus from 'http-status'

// 1. Create Job:
const createJob = catchAsync(async (req, res) => {
  const user = req.user
  const payload = req.body
  const files = req.files
  console.log({
    user,
    payload,
    file: req.files,
  })

  const result = await jobServices.createJob(user, payload, files)

  sendResponse(res, {
    success: true,
    message: `Job created successfully!`,
    statusCode: httpStatus.CREATED,
    data: result,
  })
})

export const jobController = {
  createJob,
}
