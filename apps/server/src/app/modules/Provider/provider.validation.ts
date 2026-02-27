import { requiredString } from 'packages/shared/src'
import z from 'zod'

const getProviderDetailsById = z.object({
  params: z.object({
    id: requiredString('Provider ID'),
  }),
})

export const providerValidation = {
  getProviderDetailsById,
}
