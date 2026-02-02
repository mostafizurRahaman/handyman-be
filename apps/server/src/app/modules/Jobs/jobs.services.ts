import { Job, ServiceCategory, User, type IUser } from '@repo/db'

import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import type { TCreateJobType } from './job.validations'
import { uploadMultipleFileToS3 } from 'packages/media-hub/src'
import { Types } from 'mongoose'

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

    prefferedDate,
    prefferedTime,
  } = payload

  // 3. Check is category exists:
  const serviceCategory = await ServiceCategory.findById(category)
  if (!serviceCategory) {
    throw new AppError(httpStatus.NOT_FOUND, 'Service Category does not found!')
  }

  // 4. Minimum one file is required:
  if (files.length < 1) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Minimum one image is required!')
  }

  // 5. Check is preffered data is less then now?:
  if (new Date(prefferedDate).getTime() < Date.now()) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Preffered should be future date!')
  }
  // 5. Uploads
  const uploadedFiles = await uploadMultipleFileToS3(files, 'jobs')

  // 6. prepare job payload:
  const jobPayload = {
    customer: new Types.ObjectId(user._id),
    category: new Types.ObjectId(serviceCategory?._id),
    title,
    description: description as string,
    location,
    lat,
    long,
    price,
    aggreedPrice: 0,
    prefferedDate: new Date(prefferedDate),
    prefferedTime: new Date(prefferedTime),
    images: uploadedFiles.map((image) => image?.url),
  }

  // 6. Save the job with pending status:
  const job = await Job.create(jobPayload)

  return job
}

export const jobServices = {
  createJob,
}
