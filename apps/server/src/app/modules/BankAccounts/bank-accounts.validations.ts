import { enumString, requiredString } from '@repo/shared'
import z from 'zod'

const addBankAccountValidation = z.object({
  body: z.object({
    bankCode: requiredString('Bank code'),
    accountNumber: requiredString('Account number'),
    accountName: requiredString('Account Name'),
    currency: enumString(['NGN'], 'Currency'),
  }),
})

export const BankAccountValidations = {
  addBankAccountValidation,
}

export type TAddAccountPayloadType = z.infer<typeof addBankAccountValidation.shape.body>
