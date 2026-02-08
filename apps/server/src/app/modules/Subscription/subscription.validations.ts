import { SubscriptionStatusValues } from 'packages/db/src'
import {
  optionalDate,
  optionalEnumString,
  optionalPositive,
  optionalString,
  requiredString,
} from 'packages/shared/src'
import z from 'zod'

// create Subscription:
const initSubscriptionSchema = z.object({
  body: z.object({
    planId: requiredString('Plan ID'),
  }),
})

const getAllSubscriptionSchema = z.object({
  query: z.object({
    searchTerm: optionalString('Search Term'),
    sortBy: optionalString('SortBy'),
    sortOrder: optionalEnumString(['asc', 'desc'], 'SortOrder'),
    limit: optionalPositive('Limit').default(10),
    page: optionalPositive('Page').default(1),
    status: optionalEnumString(SubscriptionStatusValues, 'Subscription status'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

export const subscriptionValidations = {
  initSubscriptionSchema,
  getAllSubscriptionSchema,
}

export type TInitSubscriptionType = z.infer<typeof initSubscriptionSchema.shape.body>
export type TGetAllSubscriptionsQueryType = z.infer<typeof getAllSubscriptionSchema.shape.query>
