import {
  optionalDate,
  optionalEnumString,
  optionalPositive,
  optionalString,
  requiredString,
  sortingValues,
} from '@repo/shared'
import { PaymentStatusValues } from 'packages/db/src'
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
    status: optionalEnumString(PaymentStatusValues, 'status'),
  }),
})

const getSinglePaymentById = z.object({
  params: z.object({
    id: requiredString('Payment ID'),
  }),
})

export const paymentValidations = {
  getAllPayments,
  getSinglePaymentById,
}

export type IGetAllPaymentsQuery = z.infer<typeof getAllPayments.shape.query>
