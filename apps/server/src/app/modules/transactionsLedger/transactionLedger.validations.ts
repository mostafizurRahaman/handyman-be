import { TransactionLedgerValues } from 'packages/db/src'
import {
  optionalDate,
  optionalEnumString,
  optionalPositive,
  optionalString,
} from 'packages/shared/src'
import z from 'zod'

const getAllTransactionLedgers = z.object({
  query: z.object({
    job: optionalString('Job'),
    user: optionalString('User ID'),
    page: optionalPositive('Page'),
    limit: optionalPositive('Limit'),
    sort: optionalString('Sort'),
    type: optionalEnumString(TransactionLedgerValues, 'Status'),
    searchTerm: optionalString('Search Term'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

export const transactionLedgerValidations = {
  getAllTransactionLedgers,
}

export type IGetAllTransactionLedgers = z.infer<typeof getAllTransactionLedgers.shape.query>
