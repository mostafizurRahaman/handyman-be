import { optionalNumber, optionalString, requiredEmail, requiredString } from 'packages/shared/src'
import z from 'zod'

const nigerianNumberSchema = z
  .string()
  .trim()
  // Step 1: allow only digits and optional leading +
  .regex(/^[+\d]+$/, {
    message: 'Phone number contains invalid characters',
  })
  // Step 2: normalize spaces/dashes if needed (optional)
  .transform((v) => v.replace(/[\s-]/g, ''))
  // Step 3: validate Nigerian format
  .pipe(
    z.string().regex(/^(?:\+234|234|0)(70|80|81|90|91)[0-9]{8}$/, {
      message: 'Invalid Nigerian phone number',
    })
  )
  .optional()

const createAdmin = z.object({
  body: z.object({
    name: requiredString('Name'),
    email: requiredEmail('Email'),
    password: requiredString('Password').min(8, 'Password must be at least 8 characters long'),
    phoneNumber: nigerianNumberSchema,
  }),
})

const updateAdmin = z.object({
  params: z.object({
    id: requiredString('Admin ID'),
  }),
  body: z.object({
    name: requiredString('Name'),
    phoneNumber: nigerianNumberSchema,
  }),
})
const deleteAdmin = z.object({
  params: z.object({
    id: requiredString('Admin ID'),
  }),
})
const getAdmin = z.object({
  params: z.object({
    id: requiredString('Admin ID'),
  }),
})

const getAllAdmins = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    sortBy: optionalString('Sort By'),
    sortOrder: optionalString('Sort Order'),
    searchTearm: optionalString('Search Term'),
  }),
})

export const adminValidations = {
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getAdmin,
  getAllAdmins,
}

export type TCreateAdminType = z.infer<typeof createAdmin>['body']
export type TUpdateAdminType = z.infer<typeof updateAdmin>['body']
export type TGetAllAdminsType = z.infer<typeof getAllAdmins>['query']
