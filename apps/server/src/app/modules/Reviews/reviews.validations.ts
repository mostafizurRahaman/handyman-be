import { optionalString, positiveNumber, requiredString } from 'packages/shared/src'
import z from 'zod'

const createReviewValidationSchema = z.object({
  body: z.object({
    job: requiredString('Job ID'),
    provider: requiredString('Provider ID'),
    customer: requiredString('Customer ID'),
    star: positiveNumber('Star'),
    comment: optionalString('Comment'),
  }),
})


const reviewValidationSchema = { 
   
}