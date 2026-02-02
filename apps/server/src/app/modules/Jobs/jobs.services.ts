import { ServiceCategory, User, type IUser } from '@repo/db'

import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import type { TCreateJobType } from './job.validations'
import { uploadMultipleFileToS3 } from 'packages/media-hub/src'

const createJob = async (
  userInfo: IUser,
  payload: TCreateJobType,
  files: Express.Multer.File[]
) => {
  // 1. Check is user exists:
  const user = await User.findById(userInfo._id)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not found!')
  }

  // 2. destructure payload :
  const {
    category,
    title,
    description,
    location,
    lat,
    long,
    price,
    aggreedPrice,
    prefferedDate,
    prefferedTime,
  } = payload

  // 3. Check is category exists:
  const serviceCategory = await ServiceCategory.findById(category)
  if (!serviceCategory) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service Category does not found!')
  }

  // 4. Save the job with Pending status:
  const uploadedFiles = await uploadMultipleFileToS3(files, 'jobs')

  console.log(uploadedFiles)
}

export const jobServices = {
  createJob,
}
