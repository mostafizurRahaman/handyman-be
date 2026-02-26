import {
  optionalDate,
  optionalEnumString,
  optionalPositive,
  optionalString,
  sortingValues,
} from '@repo/shared'
import z from 'zod'

const getAllPayments = z.object({
  query: z.object({
    page: optionalPositive('Page'),
    limit: optionalPositive('Limit'),
    searchTerm: optionalString('Search Term'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
    sortOrder: optionalEnumString(sortingValues, 'sortOrder'),
    sortBy: optionalString('Sort By'),
  }),
})

export const paymentValidations = {
  getAllPayments,
}
