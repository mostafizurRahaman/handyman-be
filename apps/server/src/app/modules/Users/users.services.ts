import type { PipelineStage } from 'mongoose'
import type { TGetAllUserQueryType, TUpdateUserStatusByIdBodyType } from './users.validation'
import { AuthRoles, AuthStatus, User, type IUser } from 'packages/db/src'
import { AppError, getYearRange } from 'packages/shared/src'
import httpStatus from 'http-status'
import { logger } from '@app/libs/logger'

// 1. Get all users:
const getAllUsers = async (query: TGetAllUserQueryType) => {
  const {
    limit = 10,
    page = 1,
    role,
    fromDate,
    searchTerm,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    status,
    toDate,
  } = query

  const skip = (Number(page) - 1) * Number(limit)

  const allowedSortFields = ['email', 'createdAt', 'updatedAt']

  if (!allowedSortFields.includes(sortBy)) {
    throw new AppError(400, 'Invalid sort field')
  }

  const searchableFields = ['name', 'email']

  const pipeline: PipelineStage[] = [
    {
      $match: {
        role,
      },
    },

    //  // 2. Lookup provider
    {
      $lookup: {
        from: 'providers',
        localField: '_id',
        foreignField: 'user',
        as: 'providerDetails',
        pipeline: [
          {
            $project: {
              _id: 0,
              updatedAt: 0,
              createdAt: 0,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$providerDetails',
        preserveNullAndEmptyArrays: true,
      },
    },

    ...(status ? [{ $match: { status } }] : []),
  ]

  // 4. Projection
  if (fromDate || toDate) {
    const dateFilter: Record<string, Date> = {}
    if (fromDate) {
      dateFilter.$gte = new Date(fromDate)
    }

    if (toDate) {
      dateFilter.$lte = new Date(toDate)
    }

    pipeline.push({
      $match: {
        createdAt: dateFilter,
      },
    })
  }

  // 4. Projection
  pipeline.push({
    $project: {
      password: 0,
      isTwoFactorEnabled: 0,
      twoFactorBackupCodes: 0,
    },
  })
  // 5. Search
  if (searchTerm) {
    pipeline.push({
      $match: {
        $or: searchableFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })),
      },
    })
  }

  // 6. Pagination + meta
  pipeline.push({
    $facet: {
      data: [
        {
          $sort: {
            [sortBy]: sortOrder === 'asc' ? 1 : -1,
          },
        },
        { $skip: skip },
        { $limit: Number(limit) },
      ],
      meta: [{ $count: 'total' }],
    },
  })

  const [result] = await User.aggregate(pipeline)

  const total = result.meta[0]?.total || 0

  return {
    data: result.data,
    meta: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)),
    },
  }
}

// 2. Get single user by id:
const getSingleUserById = async (id: string) => {
  const user = await User.findById(id)

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't exists!`)
  }

  const userInfo = User.aggregate([
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
        as: 'providerDetails',
        pipeline: [
          {
            $project: {
              _id: 0,
              updatedAt: 0,
              createdAt: 0,
            },
          },
        ],
      },
    },
    {
      $unwind: {
        path: '$providerDetails',
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        password: 0,
        isTwoFactorEnabled: 0,
        twoFactorBackupCodes: 0,
      },
    },
  ])

  return userInfo
}

// 3. Block user by id:
const updateUserStatusById = async (
  adminUser: IUser,
  id: string,
  payload: TUpdateUserStatusByIdBodyType
) => {
  const { status, reason } = payload
  const user = await User.findById(id)

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, `User doesn't exists!`)
  }

  if (user._id?.toString() === adminUser?._id?.toString()) {
    throw new AppError(httpStatus.BAD_REQUEST, `Selt modification not allowed!`)
  }

  if (user?.role === AuthRoles.SUPER_ADMIN && adminUser?.role !== AuthRoles.SUPER_ADMIN) {
    throw new AppError(httpStatus.FORBIDDEN, 'Insufficient permissions')
  }

  if (user?.status === AuthStatus.IN_REVIEW) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `User documents is in_review. You cann't update now!`
    )
  }

  if (user?.status === AuthStatus.DELETED) {
    throw new AppError(httpStatus.BAD_REQUEST, `User has already been deleted!`)
  }

  if (status === AuthStatus.ACTIVE) {
    if (user.role === AuthRoles.PROVIDER && !user.isDocumentVerified) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        'Cannot activate provider: Identity documents are not yet verified by Didit.'
      )
    }

    user.status = AuthStatus.ACTIVE
    user.isOtpVerified = true
    user.blockedReason = ''
  }

  if (status === AuthStatus.BLOCKED) {
    if (user?.status === AuthStatus.BLOCKED) {
      throw new AppError(httpStatus.BAD_REQUEST, `User has already been blocked!`)
    }

    user.blockedAt = new Date()
    user.blockedReason = reason || 'Reason not provided!'
    user.status = AuthStatus.BLOCKED
  }

  await user.save()
  return user
}

// 4. Get User Overview:
const getUserOverview = async (year: number) => {
  const { startDate, endDate } = getYearRange(year)

  const [totalProvider, totalCustomer, userStats] = await Promise.all([
    await User.countDocuments({
      role: AuthRoles.PROVIDER,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }),
    await User.countDocuments({
      role: AuthRoles.CUSTOMER,
      createdAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      },
    }),
    await User.aggregate([
      {
        $match: {
          role: { $in: [AuthRoles.PROVIDER, AuthRoles.CUSTOMER] },
          createdAt: {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        },
      },
      {
        $project: {
          role: 1,
          month: { $month: '$createdAt' }, // 1–12
        },
      },
      {
        $group: {
          _id: {
            month: '$month',
            role: '$role',
          },
          count: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.month',
          provider: {
            $sum: {
              $cond: [{ $eq: ['$_id.role', AuthRoles.PROVIDER] }, '$count', 0],
            },
          },
          customer: {
            $sum: {
              $cond: [{ $eq: ['$_id.role', AuthRoles.CUSTOMER] }, '$count', 0],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          month: '$_id',
          provider: 1,
          customer: 1,
        },
      },
      {
        $sort: { month: 1 },
      },
    ]),
  ])

  const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ]

  const formattedData = MONTHS?.map((item, index) => {
    const currentMonth = userStats.find((item) => item.month === index + 1)
    return {
      month: item,
      provider: currentMonth?.provider || 0,
      customer: currentMonth?.customer || 0,
    }
  })

  return {
    totalCustomer,
    totalProvider,
    userStats: formattedData,
  }
}

export const userServices = {
  getAllUsers,
  getSingleUserById,
  updateUserStatusById,
  getUserOverview,
}
