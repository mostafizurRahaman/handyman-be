import { Job, JobStatus, Review, type IJobDocument, type IUser } from '@repo/db'
import type {
  ICreateReviewPayloadType,
  IGetReviewQueryType,
  IUpdateReviewPayloadType,
} from './reviews.validations'
import { AppError, QueryBuilder } from '@repo/shared'
import httpStatus from 'http-status'
import type { Types } from 'mongoose'
import { logger } from '@app/libs/logger'

const createReview = async (user: IUser, payload: ICreateReviewPayloadType) => {
  const { job: jobId, star, comment } = payload

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `Customer doesn't exists!`)
  }

  // Check is the jobs exists?:
  const job = await Job.findById(jobId)
  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, `Job doesn't exists!`)
  }

  //   Check is this job belongs to this customer ?:
  if (job.customer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `This job doesn't belongs to your account!`)
  }

  // check job status :
  if (job.status !== JobStatus.CLOSED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Review can only be submitted after the job is closed. Current status "${job.status}"`
    )
  }

  // Check is already review provided?:
  const isAlreadyReviewed = await Review.exists({ job: job._id })

  if (isAlreadyReviewed) {
    throw new AppError(httpStatus.BAD_REQUEST, 'You have already submitted a review for this job.')
  }

  //   Review paylaod:
  const reviewPayload = {
    job: job?._id,
    customer: job.customer,
    provider: job.assignedTo as Types.ObjectId,
    star,
    comment: comment as string,
  }

  const review = await Review.create(reviewPayload)
  return review
}

const updateReview = async (user: IUser, id: string, payload: IUpdateReviewPayloadType) => {
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `Customer doesn't exists!`)
  }

  //  Check is review exists?:
  const review = await Review.findById(id).populate<{ job: IJobDocument }>('job')
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, "This review doesn't exists!")
  }

  // Check is the jobs exists?:
  const job = await Job.findById(review?.job?._id?.toString())
  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, `Job doesn't exists!`)
  }

  //   Check is this job belongs to this customer ?:
  if (job.customer?.toString() !== user?._id?.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `This job doesn't belongs to your account!`)
  }

  // check job status :
  if (job.status !== JobStatus.CLOSED) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Review can only be submitted after the job is closed. Current status "${job.status}"`
    )
  }

  //   update now :
  if (payload.star !== undefined) review.star = payload.star
  if (payload.comment !== undefined) review.comment = payload.comment

  await review.save()

  return {
    _id: review?._id,
    job: review?.job?._id,
    star: review?.star,
    comment: review?.comment,
  }
}

const getReviewById = async (id: string) => {
  const review = await Review.findById(id)
  if (!review) {
    throw new AppError(httpStatus.NOT_FOUND, `Review doesn't exists!`)
  }
  return review
}

const getAllReviews = async (query: IGetReviewQueryType) => {
  const searchableFields = ['comment']

  logger.info('query', query)

  const { fromDate, toDate, ...filter } = query

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filterQuery: any = {}

  // ✅ Date range filter
  if (fromDate || toDate) {
    filterQuery.createdAt = {}

    if (fromDate) {
      filterQuery.createdAt.$gte = new Date(fromDate)
    }

    if (toDate) {
      filterQuery.createdAt.$lte = new Date(toDate)
    }
  }

  const reivewQuery = new QueryBuilder(Review.find(filterQuery), filter)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()

  const data = await reivewQuery.modelQuery
  const meta = await reivewQuery.countTotal()

  return {
    data,
    meta,
  }
}

export const reviewService = {
  createReview,
  updateReview,
  getReviewById,
  getAllReviews,
}
