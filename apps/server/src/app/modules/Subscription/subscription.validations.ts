import { requiredString } from 'packages/shared/src'
import z from 'zod'

// create Subscription:
const initSubscriptionSchema = z.object({
  body: z.object({
    planId: requiredString('Plan ID'),
  }),
})

export const subscriptionValidations = {
  initSubscriptionSchema,
}

export type TInitSubscriptionType = z.infer<typeof initSubscriptionSchema.shape.body>
