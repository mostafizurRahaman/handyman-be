import {
  optionalEnumString,
  optionalPositive,
  optionalString,
  positiveNumber,
  sortingValues,
} from 'packages/shared/src'
import z from 'zod'

const getAllPayments = z.object({
  query: z.object({
    page: optionalPositive('Page'),
    limit: optionalPositive('Limit'),
    netAmount: positiveNumber('netAmount'),
    searchTerm: optionalString('Search Term'),
    sortBy: optionalString('Sort By'),
    sortOrder: optionalEnumString(sortingValues, 'Sort Order'),
    fromDate: optionalString('From Date'),
    toDate: optionalString('To Date'),
  }),
})

export const paymentValidations = {
  getAllPayments,
}

export type TGetAllPayments = z.infer<typeof getAllPayments.shape.query>
