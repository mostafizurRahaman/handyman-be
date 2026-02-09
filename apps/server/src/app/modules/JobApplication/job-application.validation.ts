import { optionalString, positiveNumber, requiredString } from 'packages/shared/src'
import z from 'zod'

const createJobApplication = z.object({
  body: z.object({
    job: requiredString('Job Id'),
    proposed_price: positiveNumber('Propose price'),
    message: optionalString('Message'),
  }),
})

const updateJobApplication = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
  body: z
    .object({
      proposed_price: positiveNumber('Propose price'),
      message: optionalString('Message'),
    })
    .partial(),
})

const getJobApplicationById = z.object({
  params: z.object({
    id: requiredString('ID'),
  }),
})

export const jobApplicationValidation = {
  createJobApplication,
  updateJobApplication,
  getJobApplicationById,
}

export type TCreateJobApplication = z.infer<typeof createJobApplication.shape.body>
export type TUpdateJobApplication = z.infer<typeof updateJobApplication.shape.body>
