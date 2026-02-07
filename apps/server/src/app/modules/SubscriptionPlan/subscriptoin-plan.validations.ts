import { subscriptionIntervalValues, subscriptionOptionValues } from '@repo/db'
import {
  enumString,
  optionalEnumString,
  optionalNumber,
  optionalString,
  requiredNumber,
} from '@repo/shared'
import z from 'zod'

// create subsciption plan:
const createSubPlanSchema = z.object({
  body: z.object({
    name: enumString(subscriptionOptionValues, 'Plan name'),
    amount: requiredNumber('Amount'),
    interval: enumString(subscriptionIntervalValues, 'Interval'),
  }),
})

// create subsciption plan:
export const subscriptionQuerySchema = z.object({
  query: z.object({
    name: optionalEnumString(subscriptionOptionValues, 'Plan name'),
    interval: optionalEnumString(subscriptionIntervalValues, 'Interval'),
    limit: optionalNumber('Limit'),
    page: optionalNumber('Sage'),
    sort: optionalString('Sort'),
    searchTerm: optionalString('Search term'),
  }),
})

export const subscriptionPlanValidations = {
  createSubPlanSchema,
  subscriptionQuerySchema,
}

export type TCreateSubscriptonPlanType = z.infer<typeof createSubPlanSchema.shape.body>
export type TSubscriptionQuerySchema = z.infer<typeof subscriptionQuerySchema.shape.query>
