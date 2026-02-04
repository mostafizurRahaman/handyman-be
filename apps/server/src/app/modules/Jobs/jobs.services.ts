import {
  AuthRoles,
  Job,
  JobApplication,
  JobSStatus,
  ServiceCategory,
  User,
  type IUser,
} from '@repo/db'

import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import type { TCreateJobType, TGetCustomerAllJobsQueryType } from './job.validations'
import {
  deleteMultipleFilesFromS3,
  deleteSingleFileFromS3,
  uploadMultipleFileToS3,
} from 'packages/media-hub/src'
import { Types, type PipelineStage } from 'mongoose'
import { logger } from '@app/libs/logger'

// 1. Create Job:
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
  const { category, title, description, location, lat, long, price, prefferedDate, prefferedTime } =
    payload

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

// 2. Update Job:
const updateJob = async (
  userInfo: IUser,
  jobId: string,
  payload: Partial<TCreateJobType>,
  files: Express.Multer.File[] = []
) => {
  logger.debug({
    jobId,
    userInfo,
    payload,
    files,
  })
  // 1. Check is user exists:
  const user = await User.findById(userInfo._id)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not found!')
  }

  // 2. Find the job
  const job = await Job.findById(jobId)
  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found!')
  }

  // 3. Check if job is still pending
  if (job.status !== JobSStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You cannot update this job because its current status is "${job.status}"`
    )
  }

  //4. Check job owner is matched?:
  if (job.customer !== user?._id) {
    throw new AppError(httpStatus.FORBIDDEN, 'This job is not associated with your account.')
  }

  // 5. Check if there are applications for this job
  const jobApplications = await JobApplication.find({ job: job._id })

  if (jobApplications.length > 0) {
    const blockedFields: string[] = []

    if (payload.lat && job.lat !== payload.lat) blockedFields.push('latitude')
    if (payload.long && job.long !== payload.long) blockedFields.push('longitude')
    if (payload.location && job.location !== payload.location) blockedFields.push('location')
    if (payload.price && job.price !== payload.price) blockedFields.push('price')
    if (payload.category && job.category?.toString() !== payload.category)
      blockedFields.push('category')

    if (blockedFields.length > 0) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `You cannot update the following fields because there are already applications: ${blockedFields.join(', ')}`
      )
    }
  }

  if (payload.title) job.title = payload.title
  if (payload.description) job.description = payload.description
  if (payload.location) job.location = payload.location
  if (payload.lat) job.lat = payload.lat
  if (payload.long) job.long = payload.long
  if (payload.price) job.price = payload.price
  if (payload.prefferedDate) {
    if (new Date(payload.prefferedDate).getTime() < Date.now()) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Preferred date should be in the future!')
    }
    job.prefferedDate = new Date(payload.prefferedDate)
  }
  if (payload.prefferedTime) job.prefferedTime = new Date(payload.prefferedTime)

  // 6. Update category if provided
  if (payload.category) {
    const serviceCategory = await ServiceCategory.findById(payload.category)
    if (!serviceCategory) {
      throw new AppError(httpStatus.NOT_FOUND, 'Service Category not found!')
    }
    job.category = new Types.ObjectId(serviceCategory._id)
  }

  // 7. Handle new images if any
  if (files.length > 0) {
    const uploadedFiles = await uploadMultipleFileToS3(files, 'jobs')
    const newImages = uploadedFiles.map((file) => file.url)
    job.images = [...(job.images as string[]), ...newImages]
  }

  // 8. Save updated job
  await job.save()

  return job
}

// 3. Get all jobs:
const getCustomAllJobs = async (userInfo: IUser, query: TGetCustomerAllJobsQueryType) => {
  // 1️⃣ Destructure & set defaults
  const { fromDate, toDate, searchTerm, sortOrder = 'desc', sortBy = 'createdAt', status } = query

  const limit = Number(query.limit) || 10
  const page = Number(query.page) || 1

  // 2️⃣ Check user exists
  const user = await User.findById(userInfo._id)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't found!`)
  }

  // 3️⃣ Check user role
  if (user.role !== AuthRoles.CUSTOMER) {
    throw new AppError(httpStatus.FORBIDDEN, `You are not authorized to perform this action.`)
  }

  // 4️⃣ Build base pipeline
  const pipeline: PipelineStage[] = [
    {
      $match: {
        customer: new Types.ObjectId(user._id),
      },
    },
  ]
  const countPipeline: PipelineStage[] = [
    {
      $match: {
        customer: new Types.ObjectId(user._id),
      },
    },
  ]

  // 5️⃣ Date filter
  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) dateFilter.$gte = new Date(fromDate)
    if (toDate) dateFilter.$lte = new Date(toDate)

    pipeline.push({
      $match: { createdAt: dateFilter },
    })
    countPipeline.push({
      $match: { createdAt: dateFilter },
    })
  }

  // 6️⃣ Search term
  if (searchTerm) {
    const escapedTerm = searchTerm.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const searchableFields = ['title', 'description']
    const searchQuery = {
      $match: {
        $or: searchableFields.map((field) => ({
          [field]: { $regex: escapedTerm, $options: 'i' },
        })),
      },
    }
    pipeline.push(searchQuery)
  }

  // 7️⃣ Status filter
  if (status) {
    const statusQuery = {
      $match: { status },
    }
    pipeline.push(statusQuery)
  }

  // 8️⃣ Sorting
  const sortStage: Record<string, 1 | -1> = {}
  sortStage[sortBy] = sortOrder === 'asc' ? 1 : -1
  pipeline.push({ $sort: sortStage })

  // 9️⃣ Pagination
  const skip = (page - 1) * Number(limit)
  pipeline.push({ $skip: skip }, { $limit: Number(limit) })

  // 1️⃣0️⃣ Execute aggregation
  const jobs = await Job.aggregate(pipeline)

  // 1️⃣1️⃣ Optional: total count for meta
  const total = (await Job.aggregate([...countPipeline, { $count: 'total' }]))[0]?.total || 0

  return {
    data: jobs,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  }
}

// 4. Get Job By Id:
const getJobById = async (id: string) => {
  const job = await Job.findById(id)

  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found!')
  }

  return job
}

// 5. Get Job By Id:
const deleteJobById = async (userInfo: IUser, id: string) => {
  // 1. Check is user exists:
  const user = await User.findById(userInfo._id)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not found!')
  }

  //2. if job deson't exists:
  const job = await Job.findById(id)
  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found!')
  }
  //3. Check job owner is matched?:
  if (job.customer !== user?._id) {
    throw new AppError(httpStatus.FORBIDDEN, 'This job is not associated with your account.')
  }

  // 4. Check job status is pending?:
  if (job.status !== 'pending') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You cann't delete the job. Current status ${job.status}`
    )
  }

  // 5. Delete all the images:
  await Job.deleteOne({
    _id: job._id,
  })

  // 6. delete all jobs related to this:
  await JobApplication.deleteMany({
    job: job?._id,
  })

  // 7. delete all the files:
  await deleteMultipleFilesFromS3(job.images as string[])

  return job
}

// 6. delete images from job:
const deleteImageFromJobById = async (userInfo: IUser, id: string, imageUrl: string) => {
  // 1. Check is user exists:
  const user = await User.findById(userInfo._id)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not found!')
  }

  //2. if job deson't exists:
  const job = await Job.findById(id)
  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found!')
  }

  //3. Check job owner is matched?:
  if (job.customer !== user?._id) {
    throw new AppError(httpStatus.FORBIDDEN, 'This job is not associated with your account.')
  }

  // 4. Check job status is pending?:
  if (job.status !== 'pending') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You cann't delete the job. Current status ${job.status}`
    )
  }

  // 5. Delete image from s3:
  await deleteSingleFileFromS3(imageUrl)

  // 6. Remove the url from db:
  const images = job.images?.filter((image) => image !== imageUrl)

  // 7. Update now:
  const updatedJob = await Job.findOneAndUpdate(
    {
      _id: job?._id,
    },
    {
      images,
    },
    {
      new: true,
    }
  )

  return updatedJob
}

// 7. Add new images into job:
const addImageIntoJobById = async (userInfo: IUser, id: string, files: Express.Multer.File[]) => {
  // 1. Check is user exists:
  const user = await User.findById(userInfo._id)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not found!')
  }

  //2. if job deson't exists:
  const job = await Job.findById(id)
  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found!')
  }

  // 3. Check job owner is matched?:
  if (job.customer !== user?._id) {
    throw new AppError(httpStatus.FORBIDDEN, 'This job is not associated with your account.')
  }

  // 4. Check job status is pending?:
  if (job.status !== 'pending') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You cann't delete the job. Current status ${job.status}`
    )
  }

  // 5. upload the new images:
  const uploadImages = await uploadMultipleFileToS3(files, 'jobs')
  const newImages = uploadImages?.map((img) => img.url)

  // 6. Merge Previous and New Images:
  const images = job?.images ? [...job.images, ...newImages] : [...newImages]

  // 7. Update now:
  const updatedJob = await Job.findOneAndUpdate(
    {
      _id: job?._id,
    },
    {
      images,
    },
    {
      new: true,
    }
  )

  return updatedJob
}

export const jobServices = {
  createJob,
  updateJob,
  getCustomAllJobs,
  getJobById,
  deleteJobById,
  deleteImageFromJobById,
  addImageIntoJobById,
}
