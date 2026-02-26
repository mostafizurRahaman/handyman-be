import { JobStatus, User } from '@repo/db'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'

import type { PipelineStage } from 'mongoose'

const getProviderDetailsById = async (id: string) => {
  // check is provider exists :
  const user = await User.findById(id)
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't exists!`)
  }

  const pipeline: PipelineStage[] = [
    {
      $match: {
        _id: user?._id,
      },
    },
    {
      $lookup: {
        from: 'providers',
        localField: '_id',
        foreignField: 'user',
        as: 'profile',
        pipeline: [
          {
            $lookup: {
              from: 'servicecategories',
              localField: 'serviceCategory',
              foreignField: '_id',
              as: 'serviceCategoryDetails',
            },
          },
          {
            $unwind: {
              path: '$serviceCategoryDetails',
              preserveNullAndEmptyArrays: true,
            },
          },
        ],
      },
    },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'provider',
        as: 'reviews',
      },
    },
    {
      $unwind: {
        path: '$profile',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $lookup: {
        from: 'jobs',
        pipeline: [
          {
            $match: {
              assignedTo: user?._id,
              status: JobStatus.CLOSED,
            },
          },
        ],
        as: 'jobs',
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
        totalCompltedJobs: {
          $size: '$jobs',
        },
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        phoneNumber: 1,
        profileImage: 1,
        startTime: '$profile.startTime',
        endTime: '$profile.endTime',
        weekdays: '$profile.weekdays',
        serviceCategory: '$profile.serviceCategoryDetails._id',
        serviceCategoryName: '$profile.serviceCategoryDetails.title',
        joinedAt: '$createdAt',
        averageRatings: 1,
        totalRatings: 1,
        totalCompltedJobs: 1,
      },
    },
  ]

  //  Get user provider details:
  const profile = await User.aggregate(pipeline)

  return profile[0]
}

export const providerServices = {
  getProviderDetailsById,
}
