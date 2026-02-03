import { AuthRoles, Job, ServiceCategory, User, type IUser } from '@repo/db'

import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import type { TCreateJobType, TGetCustomerAllJobsQueryType } from './job.validations'
import { uploadMultipleFileToS3 } from 'packages/media-hub/src'
import { Types, type PipelineStage } from 'mongoose'

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

// 2. Get Job By Id:
const getJobById = async (id: string) => {
  const job = await Job.findById(id)

  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found!')
  }

  return job
}

// 4. Get Job By Id:
const deleteJobById = async (userInfo: IUser, id: string) => {
  // 1. Check is user exists:
  const user = await User.findById(userInfo._id)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User does not found!')
  }

  const job = await Job.findById(id)
  //2. if job deson't exists:
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

  return job
}

export const getCustomAllJobs = async (userInfo: IUser, query: TGetCustomerAllJobsQueryType) => {
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

export const jobServices = {
  createJob,
  getJobById,
  deleteJobById,
  getCustomAllJobs,
}
