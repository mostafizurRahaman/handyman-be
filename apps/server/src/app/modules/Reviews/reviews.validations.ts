import {
  optionalString,
  integerNumber,
  requiredString,
  optionalPositive,
  optionalDate,
} from 'packages/shared/src'
import z from 'zod'

const createReviewValidationSchema = z.object({
  body: z.object({
    job: requiredString('Job ID'),
    star: integerNumber('Star').min(1, 'Mimimum star should be 1').max(5, `Max star should be 5`),
    comment: optionalString('Comment'),
  }),
})

const updateReviewValidationSchema = z.object({
  params: z.object({
    id: requiredString('Review ID'),
  }),
  body: createReviewValidationSchema.shape.body.pick({
    star: true,
    comment: true,
  }),
})

const getReviewById = z.object({
  params: z.object({
    id: requiredString('Review ID'),
  }),
})

const getAllReivews = z.object({
  query: z.object({
    page: optionalPositive('Page'),
    limit: optionalPositive('Limit'),
    searchTerm: optionalString('Search term'),
    sort: optionalString('Sort'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
    job: optionalString('Job ID'),
    customer: optionalString('Cusotmer ID'),
    provider: optionalString('Provider ID'),
  }),
})

export const reviewValidations = {
  createReviewValidationSchema,
  updateReviewValidationSchema,
  getReviewById,
  getAllReivews,
}

export type ICreateReviewPayloadType = z.infer<typeof createReviewValidationSchema.shape.body>
export type IUpdateReviewPayloadType = z.infer<typeof updateReviewValidationSchema.shape.body>
export type IGetReviewQueryType = z.infer<typeof getAllReivews.shape.query>
