import { positiveNumber, requiredString } from '@repo/shared'
import z from 'zod'

const requestPayoutSchema = z.object({
  body: z.object({
    amount: positiveNumber('Amount'),
    bankAccountId: requiredString('Bank Account ID is required'),
  }),
})

export const payoutValidations = {
  requestPayoutSchema,
}
