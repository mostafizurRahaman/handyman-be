import { JobApplicationStatusValues } from 'packages/db/src'
import {
  optionalDate,
  optionalEnumString,
  optionalPositive,
  optionalString,
  positiveNumber,
  requiredString,
} from 'packages/shared/src'
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

const getAllJobApplications = z.object({
  query: z.object({
    job: optionalString('Job'),
    provider: optionalString('Provider'),
    page: optionalPositive('Page'),
    limit: optionalPositive('Limit'),
    sortBy: optionalEnumString(['createdAt', 'status', 'proposed_price'], 'sortBy'),
    sortOrder: optionalEnumString(['asc', 'desc'], 'sortOrder'),
    status: optionalEnumString(JobApplicationStatusValues, 'Status'),
    searchTerm: optionalString('Search Term'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

export const jobApplicationValidation = {
  createJobApplication,
  updateJobApplication,
  getJobApplicationById,
  getAllJobApplications,
}

export type TCreateJobApplication = z.infer<typeof createJobApplication.shape.body>
export type TUpdateJobApplication = z.infer<typeof updateJobApplication.shape.body>
export type TGetJobApplicationQuery = z.infer<typeof getAllJobApplications.shape.query>
