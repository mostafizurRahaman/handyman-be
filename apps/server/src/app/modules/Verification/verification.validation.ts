import { verificationStatusValues } from 'packages/db/src'
import {
  optionalDate,
  optionalEnumString,
  optionalPositive,
  optionalString,
  requiredEmail,
  sortingValues,
} from 'packages/shared/src'
import z from 'zod'

const regenerateVerificatinUrlSchema = z.object({
  body: z.object({
    email: requiredEmail('Email'),
  }),
})

const getAllVerifications = z.object({
  query: z.object({
    page: optionalPositive('Page'),
    limit: optionalPositive('Limit'),
    searchTerm: optionalString('Search Term'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
    sortOrder: optionalEnumString(sortingValues, 'sortOrder'),
    sortBy: optionalString('Sort By'),
    status: optionalEnumString(verificationStatusValues, 'status'),
  }),
})

export const verificationValidations = {
  regenerateVerificatinUrlSchema,
  getAllVerifications,
}

export type IGetAllVerificationQuery = z.infer<typeof getAllVerifications.shape.query>
