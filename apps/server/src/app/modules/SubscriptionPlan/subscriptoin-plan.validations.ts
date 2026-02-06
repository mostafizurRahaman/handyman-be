import { subscriptionIntervalValues, subscriptionOptionValues } from '@repo/db'
import { enumString, requiredNumber } from '@repo/shared'
import z from 'zod'

// create subsciption plan:
const createSubPlanSchema = z.object({
  body: z.object({
    name: enumString(subscriptionOptionValues, 'Plan name'),
    amount: requiredNumber('Amount'),
    interval: enumString(subscriptionIntervalValues, 'Interval'),
  }),
})

export const subscriptionPlanValidations = {
  createSubPlanSchema,
}

export type TCreateSubscriptonPlanType = z.infer<typeof createSubPlanSchema.shape.body>
