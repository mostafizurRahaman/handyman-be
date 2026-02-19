import { AuthRoles, AuthStatus, AuthStatusValues } from 'packages/db/src'
import {
  enumString,
  optionalDate,
  optionalEnumString,
  optionalPositive,
  optionalString,
  requiredString,
} from 'packages/shared/src'
import z from 'zod'

// 1. Get all users:
const getAllUsers = z.object({
  query: z.object({
    role: enumString([AuthRoles.CUSTOMER, AuthRoles.PROVIDER], 'Role'),
    searchTerm: optionalString('Search Term'),
    sortBy: optionalString('SortBy'),
    sortOrder: optionalEnumString(['asc', 'desc'], 'SortOrder'),
    limit: optionalPositive('Limit').default(10),
    page: optionalPositive('Page').default(1),
    status: optionalEnumString(AuthStatusValues, 'Subscription status'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

// 2. Get single user by id:
const getSingleUserByIdSchema = z.object({
  params: z.object({
    id: requiredString('UserId is required!'),
  }),
})

const updateUserStausById = z.object({
  params: z.object({
    id: requiredString('UserId is required!'),
  }),
  body: z.object({
    status: enumString([AuthStatus.ACTIVE, AuthStatus.BLOCKED], 'Status'),
    reason: optionalString('Reason'),
  }),
})

export const yearSchema = z.coerce
  .number({
    error: 'Year is required!',
  })
  .int({ message: 'Year must be an integer' })
  .min(1900, { message: 'Year must be 1900 or later' })
  .max(2100, { message: 'Year must be 2100 or earlier' })

const getUserAnalytics = z.object({
  query: z.object({
    year: yearSchema,
  }),
})

// get all providers:
const getAllProviders = z.object({
  query: z.object({
    searchTerm: optionalString('Search Term'),
    sortBy: optionalString('SortBy'),
    sortOrder: optionalEnumString(['asc', 'desc'], 'SortOrder'),
    limit: optionalPositive('Limit').default(10),
    page: optionalPositive('Page').default(1),
    status: optionalEnumString(AuthStatusValues, 'Subscription status'),
    fromDate: optionalDate('From date'),
    serviceCategory: optionalString('Service Category'),
    toDate: optionalDate('To date'),
  }),
})

export const UserValidations = {
  getAllUsers,
  getSingleUserByIdSchema,
  updateUserStausById,
  getUserAnalytics,
  getAllProviders,
}

export type TGetAllUserQueryType = z.infer<typeof getAllUsers.shape.query>
export type TGetSingleUserByIdType = z.infer<typeof getSingleUserByIdSchema.shape.params>
export type TUpdateUserStatusByIdParmas = z.infer<typeof updateUserStausById.shape.params>
export type TUpdateUserStatusByIdBodyType = z.infer<typeof updateUserStausById.shape.body>
export type TGetUserAnalytics = z.infer<typeof getUserAnalytics.shape.query>
export type TGetAllProviderQueryType = z.infer<typeof getAllProviders.shape.query>
