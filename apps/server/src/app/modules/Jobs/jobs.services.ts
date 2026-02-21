import {
  AuthRoles,
  Dispute,
  DisputeStatus,
  EscrowModel,
  EscrowStatus,
  GetLocationPoints,
  Job,
  JobApplication,
  JobStatus,
  JobStatusHistory,
  Payment,
  PaymentStatus,
  Provider,
  ServiceCategory,
  SUBSCRIPTION_RADIUS_KM,
  TransactionLedger,
  TransactionLedgerType,
  User,
  Wallet,
  type IDispute,
  type IUser,
  type TSubscriptionOptions,
} from '@repo/db'

import { AppError } from '@repo/shared'
import httpStatus from 'http-status'
import type {
  TCreateJobType,
  TCustomerDisputeJobPayloadType,
  TGetProviderAllJobsQueryType,
  TProviderCompleteJobPayloadType,
  TUpdateProviderJobStatusByIdPayloadType,
} from './job.validations'
import {
  deleteMultipleFilesFromS3,
  deleteSingleFileFromS3,
  uploadMultipleFileToS3,
} from 'packages/media-hub/src'
import mongoose, { Types, type PipelineStage } from 'mongoose'
import { subscriptionService } from '../Subscription/subscription.services'
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

  if (job.status !== JobStatus.PENDING) {
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
const getCustomAllJobs = async (userInfo: IUser, query: TGetProviderAllJobsQueryType) => {
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
const getProivderAllJobs = async (userInfo: IUser, query: TGetProviderAllJobsQueryType) => {
  const {
    status = 'all',
    limit = 10,
    page = 1,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    searchTerm,
    fromDate,
    toDate,
    minBudget,
    maxBudget,
  } = query

  const numericLimit = Number(limit)
  const numericPage = Number(page)
  const skip = (numericPage - 1) * numericLimit

  // 1️⃣ Check user exists
  const user = await User.findById(userInfo?._id)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't exist!`)
  }

  const provider = await Provider.findOne({ user: user._id.toString() })
  if (!provider) {
    throw new AppError(httpStatus.NOT_FOUND, `Provider not found!`)
  }

  // 2️⃣ Sorting validation
  const allowedSortFields = ['createdAt', 'price', 'distance']
  if (!allowedSortFields.includes(sortBy)) {
    throw new AppError(httpStatus.BAD_REQUEST, `You can sort by createdAt, price and distance`)
  }

  const searchableFields = ['title', 'description', 'address']
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filters: any = {}

  // 3️⃣ Search filter
  if (searchTerm) {
    filters.$or = searchableFields.map((field) => ({
      [field]: { $regex: searchTerm, $options: 'i' },
    }))
  }

  // 4️⃣ Date filter
  if (fromDate || toDate) {
    filters.createdAt = {}
    if (fromDate) filters.createdAt.$gte = new Date(fromDate)
    if (toDate) filters.createdAt.$lte = new Date(toDate)
  }

  // 5️⃣ Budget filter
  if (minBudget || maxBudget) {
    filters.price = {}
    if (minBudget) filters.price.$gte = Number(minBudget)
    if (maxBudget) filters.price.$lte = Number(maxBudget)
  }

  /**
   * ============================================================
   * 🔵 ALL (Pending Jobs with Geo Radius based on Subscription)
   * ============================================================
   */
  if (status === 'all') {
    const [long, lat] = provider.location.coordinates

    if (long == null || lat == null) {
      throw new AppError(httpStatus.BAD_REQUEST, 'Provide valid location for your address!')
    }

    const subscription = await subscriptionService.getCurrentSubscription(user._id.toString())

    const planName = subscription?.plan?.name || 'FREE'
    const radiusKm = SUBSCRIPTION_RADIUS_KM[planName as TSubscriptionOptions]

    const geoNearStage: PipelineStage = {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [long, lat],
        },
        distanceField: 'distance',
        spherical: true,
        query: {
          status: JobStatus.PENDING,
          ...filters,
        },
      },
    }

    if (radiusKm !== null) {
      geoNearStage.$geoNear.maxDistance = radiusKm * 1000
    }

    const aggregationPipeline: PipelineStage[] = [
      geoNearStage,
      {
        $lookup: {
          from: 'jobapplications',
          let: {
            jobID: '$_id',
          },
          pipeline: [
            {
              $match: {
                provider: user?._id,
                $expr: {
                  $eq: ['$$jobID', '$job'],
                },
              },
            },
          ],
          as: 'applications',
        },
      },
      {
        $addFields: {
          hasAlreadyApplied: {
            $gt: [{ $size: '$applications' }, 0],
          },
        },
      },

      {
        $match: {
          hasAlreadyApplied: false,
        },
      },
      {
        $project: {
          applications: 0,
        },
      },
      { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: numericLimit }],
          totalCount: [{ $count: 'total' }],
        },
      },
    ]

    const result = await Job.aggregate(aggregationPipeline)

    const jobs = result[0]?.data || []
    const total = result[0]?.totalCount[0]?.total || 0

    return {
      meta: {
        page: numericPage,
        limit: numericLimit,
        total,
        totalPages: Math.ceil(total / numericLimit),
      },
      data: jobs,
    }
  }

  /**
   * ============================================================
   * 🟡 REQUESTED JOBS
   * ============================================================
   */
  if (status === 'requested') {
    const applications = await JobApplication.find({
      provider: user._id,
      status: { $in: ['pending', 'rejected'] },
    })
      .select('job')
      .lean()

    const requestedJobIds = applications.map((item) => item.job)

    filters._id = { $in: requestedJobIds }
  }

  /**
   * ============================================================
   * 🟢 ACCEPTED / STARTED / ENROUTE / COMPLETED / CLOSED / DISPUTE
   * ============================================================
   */
  if (
    [
      JobStatus.ACCEPTED,
      JobStatus.STARTED,
      JobStatus.ENROUTE,
      JobStatus.COMPLETED,
      JobStatus.CLOSED,
      JobStatus.DISPUTE,
    ].includes(status as 'accepted' | 'enroute' | 'started' | 'completed' | 'closed' | 'dispute')
  ) {
    filters.assignedTo = user._id
    filters.status = status
  }

  /**
   * ============================================================
   * 🔵 COMMON PIPELINE (Except "all")
   * ============================================================
   */

  const aggregationPipeline: PipelineStage[] = [
    { $match: filters },
    {
      $lookup: {
        from: 'jobapplications',
        let: { jobId: '$_id' },
        pipeline: [
          {
            $match: {
              provider: user?._id,
              $expr: {
                $eq: ['$$jobId', '$job'],
              },
            },
          },
        ],
        as: 'applicationDetails',
      },
    },
    {
      $unwind: {
        path: '$applicationDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
    {
      $facet: {
        data: [{ $skip: skip }, { $limit: numericLimit }],
        totalCount: [{ $count: 'total' }],
      },
    },
  ]

  const result = await Job.aggregate(aggregationPipeline)

  console.log(result?.[0].data, { depth: Infinity })

  const jobs = result[0]?.data || []
  const total = result[0]?.totalCount[0]?.total || 0

  return {
    meta: {
      page: numericPage,
      limit: numericLimit,
      total,
      totalPages: Math.ceil(total / numericLimit),
    },
    data: jobs,
  }
}

// 9. Update Provider job status:
const updateProviderJobStatusById = async (
  user: IUser,
  id: string,
  body: TUpdateProviderJobStatusByIdPayloadType
) => {
  const { status } = body

  // 1. Check job exists:
  const job = await Job.findById(id)
  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, `Job doesn't exist!`)
  }

  // 2. Check the provider is the assigned provider:
  if (!job.assignedTo || job.assignedTo.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `You are not assigned to this job!`)
  }

  const currentStatus = job.status

  // 3. Block terminal / non-updatable statuses:
  if (
    [JobStatus.COMPLETED, JobStatus.CLOSED, JobStatus.DISPUTE].includes(
      currentStatus as 'completed' | 'closed' | 'dispute'
    )
  ) {
    throw new AppError(httpStatus.BAD_REQUEST, `Cannot update job with status "${currentStatus}"`)
  }

  // 4. Validate status transitions:
  //    enroute  → only from accepted
  //    started  → from accepted or enroute
  if (status === JobStatus.ENROUTE && currentStatus !== JobStatus.ACCEPTED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Can only set enroute from accepted status. Current status: "${currentStatus}"`
    )
  }

  if (
    status === JobStatus.STARTED &&
    ![JobStatus.ACCEPTED, JobStatus.ENROUTE].includes(currentStatus as 'accepted' | 'enroute')
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Can only start from accepted or enroute status. Current status: "${currentStatus}"`
    )
  }

  // 5. Update job status:
  job.status = status
  await job.save()

  // 6. Record status history:
  await JobStatusHistory.create({
    job: job._id,
    oldStatus: currentStatus,
    newStatus: status,
    changedByRole: AuthRoles.PROVIDER,
    changedBy: user._id,
    reason: `Provider updated job status to ${status}`,
  })

  logger.info(`✅ Job ${job._id} status updated: ${currentStatus} → ${status}`)

  return job
}

// 10. Provider complete job:
const providerCompleteJob = async (
  user: IUser,
  id: string,
  body: TProviderCompleteJobPayloadType,
  files: Express.Multer.File[]
) => {
  const { completionNote } = body

  // 1. Check job exists:
  const job = await Job.findById(id)
  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, `Job doesn't exist!`)
  }

  // 2. Check the provider is the assigned provider:
  if (!job.assignedTo || job.assignedTo.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `You are not assigned to this job!`)
  }

  // 3. Only started jobs can be completed:
  if (job.status !== JobStatus.STARTED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Only started jobs can be completed. Current status: "${job.status}"`
    )
  }

  // 4. Must provide at least one attachment as proof of completion:
  if (!files || files.length < 1) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'At least one attachment is required as proof of completion!'
    )
  }

  // 5. Upload completion attachments to S3:
  const uploadedFiles = await uploadMultipleFileToS3(files, 'job')
  const attachmentUrls = uploadedFiles.map((f) => f.url)

  const oldStatus = job.status

  // 6. Update job to completed:
  job.status = JobStatus.COMPLETED
  job.completionAttachments = attachmentUrls
  if (completionNote) {
    job.completionNote = completionNote
  }
  job.completedAt = new Date()
  await job.save()

  // 7. Record status history:
  await JobStatusHistory.create({
    job: job._id,
    oldStatus,
    newStatus: JobStatus.COMPLETED,
    changedByRole: AuthRoles.PROVIDER,
    changedBy: user._id,
    reason: completionNote || 'Provider marked job as completed',
  })

  logger.info(`✅ Job ${job._id} marked as COMPLETED by provider ${user._id}`)

  return job
}

// 11. Dispute completed job:
const customerDisputeJob = async (
  user: IUser,
  id: string,
  body: TCustomerDisputeJobPayloadType,
  files: Express.Multer.File[]
) => {
  const { reason } = body

  // 1. Check job exists:
  const job = await Job.findById(id)
  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, `Job doesn't exist!`)
  }

  // 2. Check this job belongs to the customer:
  if (job.customer.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `This job doesn't belong to your account!`)
  }

  // 3. Only completed jobs can be disputed:
  if (job.status !== JobStatus.COMPLETED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Only completed jobs can be disputed. Current status: "${job.status}"`
    )
  }

  // 4. Has any dispute open for this job?:
  const existingDispute = await Dispute.findOne({
    job: job?._id,
    status: DisputeStatus.OPEN,
  })

  if (existingDispute) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `A dispute is already open for this job. Admin is reviewing your job.`
    )
  }

  if (files?.length < 1) {
    logger.info('Files', files)
    throw new AppError(httpStatus.BAD_REQUEST, 'Mimimum one evedence is required!')
  }

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const oldStatus = job.status

    // 4. Update job status to dispute:
    job.status = JobStatus.DISPUTE
    job.disputeReason = reason
    job.disputedAt = new Date()
    await job.save({ session })

    const uploadedFiles = await uploadMultipleFileToS3(files, 'job')
    const attachmentUrls = uploadedFiles.map((f) => f.url)

    const disputePayload: IDispute = {
      job: job?._id,
      customer: job?.customer,
      provider: job?.assignedTo as Types.ObjectId,
      reason,
      customerEvidence: attachmentUrls,
      status: DisputeStatus.OPEN,
    }
    // 5. Create an dispute for this job:
    await Dispute.create([disputePayload], { session })

    // 5. Freeze the escrow so funds cannot be released:
    const escrow = await EscrowModel.findOneAndUpdate(
      { job: job._id, status: EscrowStatus.LOCKED },
      { status: EscrowStatus.FROZEN },
      { new: true, session }
    )

    if (!escrow) {
      throw new AppError(httpStatus.NOT_FOUND, `Escrow not found for this job!`)
    }

    // 6. Record status history:
    await JobStatusHistory.create(
      [
        {
          job: job._id,
          oldStatus,
          newStatus: JobStatus.DISPUTE,
          changedByRole: AuthRoles.CUSTOMER,
          changedBy: user._id,
          reason: `Customer raised dispute: ${reason}`,
        },
      ],
      { session }
    )

    await session.commitTransaction()

    logger.info(`⚠️ Job ${job._id} DISPUTED by customer ${user._id}: ${reason}`)

    return job
  } catch (error) {
    await session.abortTransaction()
    logger.error('❌ Error during job dispute', { error })
    throw error
  } finally {
    session.endSession()
  }
}

// 12. Customer close the job:
const customerCloseJob = async (user: IUser, id: string) => {
  // 1. Check job exists:
  const job = await Job.findById(id)
  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, `Job doesn't exist!`)
  }

  // 2. Check this job belongs to the customer:
  if (job.customer.toString() !== user._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `This job doesn't belong to your account!`)
  }

  // 3. Only completed jobs can be closed:
  if (job.status !== JobStatus.COMPLETED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Only completed jobs can be closed. Current status: "${job.status}"`
    )
  }

  // 4. Find the escrow for this job:
  const escrow = await EscrowModel.findOne({ job: job._id, status: EscrowStatus.LOCKED })
  if (!escrow) {
    throw new AppError(httpStatus.NOT_FOUND, `Escrow not found for this job!`)
  }

  // 5. Find the payment for this job:
  const payment = await Payment.findOne({ job: job._id })
  if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, `Payment not found for this job!`)
  }

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const oldStatus = job.status

    // 6. Update job status to closed:
    job.status = JobStatus.CLOSED
    job.closedAt = new Date()
    await job.save({ session })

    // 7. Release the escrow:
    escrow.status = EscrowStatus.RELEASED
    escrow.releasedAt = new Date()
    await escrow.save({ session })

    // 8. Update payment status to released:
    payment.status = PaymentStatus.RELEASED
    await payment.save({ session })

    // 9. Update provider wallet: move from pending to available balance:
    const providerReceives = escrow.providerReceives
    const providerReceivesInKobo = providerReceives * 100

    await Wallet.findOneAndUpdate(
      { user: job.assignedTo as Types.ObjectId },
      {
        $inc: {
          pendingBalance: -providerReceivesInKobo,
          balance: providerReceivesInKobo,
          lifetimeIncome: providerReceivesInKobo,
        },
      },
      { session, upsert: true }
    )

    // 10. Create ledger entry for the release:
    await TransactionLedger.create(
      [
        {
          user: job.assignedTo as Types.ObjectId,
          job: job._id,
          type: TransactionLedgerType.CREDIT,
          amount: providerReceives,
          reason: `Payment released for completed job`,
          reference: payment.reference,
          details: {
            agreedPrice: escrow.agreedPrice,
            customerPays: escrow.customerPays,
            platformFee: escrow.platformFee,
            gatewayFee: escrow.gatewayFee,
            gstOnPlatformFee: escrow.gstOnPlatformFee,
            providerReceives: escrow.providerReceives,
          },
        },
      ],
      { session }
    )

    // 11. Record status history:
    await JobStatusHistory.create(
      [
        {
          job: job._id,
          oldStatus,
          newStatus: JobStatus.CLOSED,
          changedByRole: AuthRoles.CUSTOMER,
          changedBy: user._id,
          reason: 'Customer approved completion and closed the job',
        },
      ],
      { session }
    )

    await session.commitTransaction()

    logger.info(`✅ Job ${job._id} CLOSED by customer ${user._id}. Payment released to provider.`)

    return job
  } catch (error) {
    await session.abortTransaction()
    logger.error('❌ Error during job close', { error })
    throw error
  } finally {
    session.endSession()
  }
}

// 13. Get Provider nearest all jobs:
const getProvierNearestJobs = async (userInfo: IUser) => {
  // 1️⃣ Check user exists
  const user = await User.findById(userInfo?._id)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't exist!`)
  }

  const provider = await Provider.findOne({ user: user._id.toString() })
  if (!provider) {
    throw new AppError(httpStatus.NOT_FOUND, `Provider not found!`)
  }

  /**
   * ============================================================
   * 🔵 ALL (Pending Jobs with Geo Radius based on Subscription)
   * ============================================================
   */

  const [long, lat] = provider.location.coordinates

  if (long == null || lat == null) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Provide valid location for your address!')
  }

  const subscription = await subscriptionService.getCurrentSubscription(user._id.toString())

  const planName = subscription?.plan?.name || 'FREE'
  const radiusKm = SUBSCRIPTION_RADIUS_KM[planName as TSubscriptionOptions]

  const geoNearStage: PipelineStage = {
    $geoNear: {
      near: {
        type: 'Point',
        coordinates: [long, lat],
      },
      distanceField: 'distance',
      spherical: true,
      query: {
        status: JobStatus.PENDING,
        category: provider?.serviceCategory,
      },
    },
  }

  if (radiusKm !== null) {
    geoNearStage.$geoNear.maxDistance = radiusKm * 1000
  }

  const aggregationPipeline: PipelineStage[] = [geoNearStage]

  // Lookup provider's application for each job
  aggregationPipeline.push({
    $lookup: {
      from: 'jobapplications',
      let: {
        jobID: '$_id',
      },
      pipeline: [
        {
          $match: {
            provider: user?._id,
            $expr: {
              $eq: ['$$jobID', '$job'],
            },
          },
        },
      ],
      as: 'applications',
    },
  })

  aggregationPipeline.push({
    $lookup: {
      from: 'users',
      localField: 'customer',
      foreignField: '_id',
      as: 'customerDetails',
    },
  })

  aggregationPipeline.push({
    $unwind: {
      path: '$customerDetails',
      preserveNullAndEmptyArrays: true,
    },
  })

  aggregationPipeline.push({
    $addFields: {
      hasAlreadyApplied: {
        $gt: [{ $size: '$applications' }, 0],
      },
      customerName: '$customerDetails.name',
      profileImage: '$customerDetails.profileImage',
    },
  })

  aggregationPipeline.push({
    $match: {
      hasAlreadyApplied: false,
    },
  })

  aggregationPipeline.push({
    $project: {
      customerDetails: 0,
      applications: 0,
    },
  })

  const result = await Job.aggregate(aggregationPipeline)

  const jobs = result || []

  return jobs
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
  updateProviderJobStatusById,
  providerCompleteJob,
  customerDisputeJob,
  customerCloseJob,
  getProvierNearestJobs,
}
