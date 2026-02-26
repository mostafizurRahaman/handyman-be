import {
  enumString,
  optionalDate,
  optionalEnumString,
  optionalPositive,
  optionalString,
  requiredString,
  sortingValues,
} from '@repo/shared'
import { disputeValues } from 'packages/db/src'
import z from 'zod'

const submitDisputeEvidenceSchema = z.object({
  params: z.object({
    id: requiredString('Dispute ID'),
  }),
})

const resolveDisputeValidationSchema = z.object({
  params: z.object({
    id: requiredString('Dispute ID'),
  }),
  body: z.object({
    decision: enumString(['REFUND_CUSTOMER', 'RELEASE_TO_PROVIDER'], 'Decision'),
    resolutionNote: requiredString('Resolution Note'),
  }),
})

const getDisputeByID = z.object({
  params: z.object({
    id: requiredString('Dispute ID'),
  }),
})

const getAllDispute = z.object({
  query: z.object({
    page: optionalPositive('Page'),
    limit: optionalPositive('Limit'),
    searchTerm: optionalString('Searchterm'),
    sortBy: optionalString('Sort By'),
    status: optionalEnumString(disputeValues, 'Status'),
    sortOrder: optionalEnumString(sortingValues, 'sortOrder'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

export const disputeValidation = {
  submitDisputeEvidenceSchema,
  resolveDisputeValidationSchema,
  getDisputeByID,
  getAllDispute,
}

export type TResolveDisputePayloadType = z.infer<typeof resolveDisputeValidationSchema.shape.body>
export type TGetAllDisputeQueryType = z.infer<typeof getAllDispute.shape.query>
