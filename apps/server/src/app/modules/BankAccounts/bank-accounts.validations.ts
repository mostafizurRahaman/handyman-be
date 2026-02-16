import {
  
  optionalDate,
  optionalString,
  positiveNumber,
  requiredString,
} from '@repo/shared'
import z from 'zod'


const addBankAccountValidation = z.object({
  body: z.object({
    bankCode: requiredString('Bank code'),
    accountNumber: requiredString('Account number'),
  }),
})

const getAllBankAccounts = z.object({
  query: z.object({
    page: positiveNumber('Page').optional(),
    limit: positiveNumber('Limit').optional(),
    sortBy: requiredString('SortBy'),
    searchTerm: optionalString('Search Term'),
    fromDate: optionalDate('From Date'),
    toDate: optionalDate('ToDate'),
  }),
})

export const BankAccountValidations = {
  addBankAccountValidation,
  getAllBankAccounts,
}

export type TAddAccountPayloadType = z.infer<typeof addBankAccountValidation.shape.body>
export type TGetAccountQueryType = z.infer<typeof getAllBankAccounts.shape.query>
