import { requiredEmail } from 'packages/shared/src'
import z from 'zod'

const regenerateVerificatinUrlSchema = z.object({
  body: z.object({
    email: requiredEmail('Email'),
  }),
})

export const verificationValidations = {
  regenerateVerificatinUrlSchema,
}
