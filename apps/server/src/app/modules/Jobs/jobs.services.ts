import {
  AuthRoles,
  GetLocationPoints,
  Job,
  JobApplication,
  JobSStatus,
  Provider,
  ServiceCategory,
  SUBSCRIPTION_RADIUS_KM,
  User,
  type IUser,
  type TSubscriptionOptions,
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
import { subscriptionService } from '../Subscription/subscription.services'

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
  const { category, title, description, address, lat, long, price, prefferedDate, prefferedTime } =
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
    address,
    location: {
      type: GetLocationPoints.Point,
      coordinates: [long, lat],
    },
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
  const userId = userInfo._id

  const job = await Job.findById(jobId)

  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, 'Job not found!')
  }

  if (!job.customer.equals(userId)) {
    throw new AppError(httpStatus.FORBIDDEN, 'You are unauthorized!')
  }

  if (job.status !== JobSStatus.PENDING) {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot update job with status "${job.status}"`)
  }

  const hasApplications = await JobApplication.exists({ job: job._id })

  if (hasApplications) {
    const blockedFields: string[] = []

    if (payload.long !== undefined && job.location.coordinates[0] !== payload.long)
      blockedFields.push('longitude')

    if (payload.lat !== undefined && job.location.coordinates[1] !== payload.lat)
      blockedFields.push('latitude')

    if (payload.address !== undefined && job.address !== payload.address)
      blockedFields.push('address')

    if (payload.price !== undefined && job.price !== payload.price) blockedFields.push('price')

    if (payload.category !== undefined && job.category?.toString() !== payload.category)
      blockedFields.push('category')

    if (blockedFields.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Cannot update fields: ${blockedFields.join(', ')}`
      )
    }
  }

  // update primitive fields
  if (payload.title !== undefined) job.title = payload.title
  if (payload.description !== undefined) job.description = payload.description
  if (payload.address !== undefined) job.address = payload.address
  if (payload.price !== undefined) job.price = payload.price

  // location
  if (payload.long !== undefined || payload.lat !== undefined) {
    job.location.coordinates = [
      payload.long ?? job.location.coordinates[0],
      payload.lat ?? job.location.coordinates[1],
    ]
  }

  // preferred date
  if (payload.prefferedDate !== undefined) {
    const preferredDate = new Date(payload.prefferedDate)

    if (preferredDate <= new Date()) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Preferred date must be future')
    }

    job.prefferedDate = preferredDate
  }

  if (payload.prefferedTime !== undefined) {
    job.prefferedTime = new Date(payload.prefferedTime)
  }

  // category
  if (payload.category !== undefined) {
    const exists = await ServiceCategory.exists({ _id: payload.category })

    if (!exists) {
      throw new AppError(httpStatus.NOT_FOUND, 'Category not found')
    }

    job.category = new Types.ObjectId(payload.category)
  }

  // images
  if (files.length) {
    const uploadedFiles = await uploadMultipleFileToS3(files, 'jobs')
    job.images?.push(...uploadedFiles.map((f) => f.url))
  }

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

// 8. Get all jobs for provider:
const getProivderAllJobs = async (userInfo: IUser, query: any) => {
  // 1. check is user exits ?
  const user = await User.findById(userInfo?._id)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't exists!`)
  }

  const provider = await Provider?.findOne({ user: user?._id?.toString() })
  if (!provider) {
    throw new AppError(httpStatus.NOT_FOUND, `Provider not found!`)
  }

  // 2. Has correct location format?:
  const [long, lat] = provider.location.coordinates

  if (!long && !lat) {
    throw new AppError(httpStatus.NOT_FOUND, 'Provide valid location for your address!')
  }

  // 3. Has subscriptions?:
  const subscription = await subscriptionService.getCurrentSubscription(user?._id?.toString())
  const planName = subscription ? subscription?.plan?.name : 'FREE'
  const radiusKm = SUBSCRIPTION_RADIUS_KM[planName as TSubscriptionOptions] || 0

  const pipeline: PipelineStage[] = []

  const geoNearStage: PipelineStage = {
    $geoNear: {
      near: {
        type: 'Point',
        coordinates: [long, lat],
      },
      distanceField: 'distance',
      spherical: true,
    },
  }

  if (['FREE', 'PRO'].includes(planName)) {
    geoNearStage.$geoNear.maxDistance = radiusKm * 1000 // km -> meters
  }

  pipeline.push(geoNearStage)

  // Get all jobs by using radius:
  const jobs = await Job.aggregate(pipeline)

  return {
    length: jobs.length,
    jobs,
  }
}
export const jobServices = {
  createJob,
  updateJob,
  getCustomAllJobs,
  getJobById,
  deleteJobById,
  deleteImageFromJobById,
  addImageIntoJobById,
  getProivderAllJobs,
}
