import {
  AuthRoles,
  Job,
  JobApplication,
  JobApplicationStatus,
  JobSStatus,
  User,
  type IUser,
} from 'packages/db/src'
import type { TCreateJobApplication, TUpdateJobApplication } from './job-application.validation'
import { AppError, QueryBuilder } from 'packages/shared/src'
import httpStatus from 'http-status'
import type { PipelineStage } from 'mongoose'

// 1. Apply into a job:
const createJobApplication = async (userInfo: IUser, payload: TCreateJobApplication) => {
  const { job, proposed_price, message } = payload

  // 1. Check is user exits ?:
  const user = await User.findById(userInfo?._id)
  if (!user || user.role !== AuthRoles.PROVIDER) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't exists!`)
  }

  // 2. Check is job exists?:
  const existingJob = await Job.findById(job)
  if (!existingJob) {
    throw new AppError(httpStatus.NOT_FOUND, `Job doesn't exists`)
  }

  // 3. Check job status:
  if (existingJob.status !== JobSStatus.PENDING) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Job status must be PENDING to apply. Current status: ${existingJob.status}`
    )
  }

  // 4. Already has application ?
  const alreadyHasApplication = await JobApplication.exists({
    job: existingJob?._id,
    provider: user?._id,
  })
  if (alreadyHasApplication) {
    throw new AppError(httpStatus.BAD_REQUEST, `You have already applied!`)
  }

  // 5. Check pricing shouldn't be negative :
  if (proposed_price <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, `Proposed pricing should be positive number!`)
  }

  // 6. place the application:
  const applicationPayload = {
    job: existingJob?._id,
    provider: user?._id,
    message: message as string,
    proposed_price,
  }

  const application = await JobApplication.create(applicationPayload)

  return application
}

// 2. Update the application:
const updateTheApplications = async (
  id: string,
  userInfo: IUser,
  payload: TUpdateJobApplication
) => {
  // 1. Check application exists
  const jobApplication = await JobApplication.findById(id)
  if (!jobApplication) {
    throw new AppError(httpStatus.BAD_REQUEST, `Job application doesn't exist!`)
  }

  // 2. Check this application belongs to this provider
  if (jobApplication.provider.toString() !== userInfo._id.toString()) {
    throw new AppError(httpStatus.FORBIDDEN, `This application doesn't belong to this user!`)
  }

  // 3. Check application status (REJECTED / ACCEPTED can't be updated)
  if (
    [JobApplicationStatus.REJECTED, JobApplicationStatus.ACCEPTED].includes(
      jobApplication?.status as 'accepted' | 'rejected'
    )
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You can't update this application at its current status : "${jobApplication.status}"!`
    )
  }

  // 4. Check job exists
  const job = await Job.findById(jobApplication.job)
  if (!job) {
    throw new AppError(httpStatus.BAD_REQUEST, `Job doesn't exist!`)
  }

  // 5. Check job status must be PENDING
  if (job.status !== 'pending') {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Job status must be PENDING to update. Current status: ${job.status}`
    )
  }

  // 6. Validate proposed price
  if (payload.proposed_price !== undefined && payload.proposed_price <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, `Proposed pricing should be a positive number!`)
  }

  // 7. Update the application
  const application = await JobApplication.findOneAndUpdate({ _id: id }, payload, { new: true })

  return application
}

// 3. Get all job application:
const getAllJobApplications = async (query) => {
  const { job, provider, status } = query

  const pipeline: PipelineStage[] = []

  // 1. Filter part:
  const filtersStage: PipelineStage = {
    $match: {},
  }

  if (query.job) {
    filtersStage.$match.job = job
  }
  if (query.provider) {
    filtersStage.$match.provider = provider
  }
  if (query.status) {
    filtersStage.$match.status = status
  }

  pipeline.push(filtersStage)

  //   //   2. Lookup Stage For Job:
  //   pipeline.push({
  //     $lookup: {
  //       from: 'jobs',
  //       localField: 'job',
  //       foreignField: '_id',
  //       as: 'jobDetails',
  //       pipeline: [
  //         {
  //           $project: {
  //             title: 1,
  //             description: 1,
  //             price: 1,
  //             location: 1,
  //             images: 1,
  //             status: 1,
  //             customer: 1,
  //           },
  //         },
  //       ],
  //     },
  //   })

  // 3. Lookup Stage For Provider  :
  pipeline.push({
    $lookup: {
      from: 'users',
      localField: 'provider',
      foreignField: '_id',
      as: 'providerDetails',
      pipeline: [
        {
          $lookup: {
            from: 'reviews',
            localField: '_id',
            foreignField: 'provider',
            as: 'reviews',
          },
        },

        {
          $addFields: {
            averageRatings: {
              $cond: [
                {
                  $gt: [
                    {
                      $size: '$reviews',
                    },
                    0,
                  ],
                },
                {
                  $round: [
                    {
                      $avg: '$reviews.star',
                    },
                    1,
                  ],
                },
                0,
              ],
            },
            totalRatings: {
              $size: '$reviews',
            },
          },
        },
        {
          $project: {
            name: 1,
            email: 1,
            profileImage: 1,
            status: 1,
            totalRatings: 1,
            averageRatings: 1,
          },
        },
      ],
    },
  })

  pipeline.push({
    $unwind: { path: '$providerDetails', preserveNullAndEmptyArrays: true },
  })

  const applications = await JobApplication.aggregate(pipeline)

  return {
    data: applications,
    meta: {},
  }
}

export const JobApplicationServices = {
  createJobApplication,
  updateTheApplications,
  getAllJobApplications,
}
