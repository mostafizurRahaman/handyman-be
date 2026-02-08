import { AuthRoles, AuthStatusValues } from 'packages/db/src'
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
    status: enumString(AuthStatusValues, 'Status'),
  }),
})

export const UserValidations = {
  getAllUsers,
  getSingleUserByIdSchema,
  updateUserStausById,
}

export type TGetAllUserQueryType = z.infer<typeof getAllUsers.shape.query>
export type TGetSingleUserByIdType = z.infer<typeof getSingleUserByIdSchema.shape.params>
export type TUpdateUserStatusByIdParmas = z.infer<typeof updateUserStausById.shape.params>
export type TUpdateUserStatusByIdBodyType = z.infer<typeof updateUserStausById.shape.body>
