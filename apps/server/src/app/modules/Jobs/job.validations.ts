import {
  enumString,
  optionalDate,
  optionalEnumString,
  optionalNumber,
  optionalString,
  requiredNumber,
  requiredString,
  sortingValues,
} from '@repo/shared'
import { JobStatus, JobStatusValues } from '@repo/db'
import z from 'zod'

// 1. create job
const createJobSchema = z.object({
  body: z.object({
    category: requiredString('Category'),
    title: requiredString('Title'),
    description: optionalString('Description'),
    address: requiredString('Location'),
    lat: requiredNumber('Lattitude')
      .min(-90, { message: `Lattitude must be between -90 and 90` })
      .max(90, { message: `Lattitude must be between -90 and 90` }),
    long: requiredNumber('Longitude')
      .min(-180, { message: `Longitude must be between -180 and 180` })
      .max(180, { message: `Longitude must be between -180 and 180` }),
    price: requiredNumber('Price').default(0),
    aggreedPrice: optionalNumber('Aggreed Price').default(0),
    prefferedDate: requiredString('Preffered Date'),
    prefferedTime: requiredString('Preffered Time'),
  }),
})

// 2. Update Job:
const updateJobSchema = z.object({
  params: z.object({
    id: requiredString('Job ID'),
  }),
  body: z
    .object({
      category: requiredString('Category'),
      title: requiredString('Title'),
      description: optionalString('Description'),
      address: requiredString('Location'),
      lat: requiredNumber('Lattitude')
        .min(-90, { message: `Lattitude must be between -90 and 90` })
        .max(90, { message: `Lattitude must be between -90 and 90` }),
      long: requiredNumber('Longitude')
        .min(-180, { message: `Longitude must be between -180 and 180` })
        .max(180, { message: `Longitude must be between -180 and 180` }),
      price: requiredNumber('Price').default(0),
      prefferedDate: requiredString('Preffered Date'),
      prefferedTime: requiredString('Preffered Time'),
    })
    .partial(),
})

// 3. Delete Job:
const deleteJobSchema = z.object({
  params: z.object({
    id: requiredString('Job ID'),
  }),
})

// 4. get Single Job:
const getSingleJobSchema = z.object({
  params: z.object({
    id: requiredString('Job ID'),
  }),
})

// 5. get Single Job:
const getCustomerAllJobs = z.object({
  query: z.object({
    page: optionalString('Page'),
    limit: optionalString('Limit'),
    sortBy: optionalString('SortBy'),
    sortOrder: optionalEnumString(sortingValues, 'Sort By'),
    searchTerm: optionalString('Search Term'),
    status: optionalEnumString(JobStatusValues, 'Job status'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

// 6. Add image into Job:
const addImageIntoJobSchema = z.object({
  params: z.object({
    id: requiredString('Job ID'),
  }),
})

// 6. Add image into Job:
const removeImageFromJobSchema = z.object({
  params: z.object({
    id: requiredString('Job ID'),
  }),
})

// 7. Get all customer jobs:
const getProivderAllJobsValidationSchema = z.object({
  query: z.object({
    page: optionalString('Page'),
    limit: optionalString('Limit'),
    sortBy: optionalString('SortBy'),
    sortOrder: optionalEnumString(sortingValues, 'Sort By'),
    searchTerm: optionalString('Search Term'),
    status: optionalEnumString([...JobStatusValues, 'requested', 'all'], 'Job status'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
    minBudget: optionalNumber('minBudget'),
    maxBudget: optionalNumber('maxBudget'),
  }),
})

// 8. Provider job status update:
const providerJobStatusUpdateValidationSchema = z.object({
  params: z.object({
    id: requiredString('Job ID'),
  }),
  body: z.object({
    status: enumString([JobStatus.STARTED, JobStatus.ENROUTE]),
  }),
})

const providerCompleteJobValidationSchema = z.object({
  params: z.object({
    id: requiredString('Job ID'),
  }),
  body: z.object({
    completionNote: optionalString('Completion Note'),
  }),
})

const customerDisputeJobValidationSchema = z.object({
  params: z.object({
    id: requiredString('Job ID'),
  }),
  body: z.object({
    reason: requiredString('Dispute Reason'),
  }),
})

const customerCloseJobValidationSchema = z.object({
  params: z.object({
    id: requiredString('Job ID'),
  }),
})

// 5. get Single Job:
const getAllJobs = z.object({
  query: z.object({
    page: optionalString('Page'),
    limit: optionalString('Limit'),
    sortBy: optionalString('SortBy'),
    sortOrder: optionalEnumString(sortingValues, 'Sort By'),
    searchTerm: optionalString('Search Term'),
    status: optionalEnumString(JobStatusValues, 'Job status'),
    fromDate: optionalDate('From date'),
    toDate: optionalDate('To date'),
  }),
})

export const jobValidationSchemas = {
  createJobSchema,
  updateJobSchema,
  deleteJobSchema,
  getSingleJobSchema,
  getCustomerAllJobs,
  addImageIntoJobSchema,
  removeImageFromJobSchema,
  getProivderAllJobsValidationSchema,
  providerJobStatusUpdateValidationSchema,
  providerCompleteJobValidationSchema,
  customerCloseJobValidationSchema,
  customerDisputeJobValidationSchema,
  getAllJobs,
}

export type TCreateJobType = z.infer<typeof createJobSchema.shape.body>
export type TGetCustomerAllJobsQueryType = z.infer<typeof getCustomerAllJobs.shape.query>
export type TGetAllJobsQueryType = z.infer<typeof getAllJobs.shape.query>
export type TGetProviderAllJobsQueryType = z.infer<
  typeof getProivderAllJobsValidationSchema.shape.query
>
export type TUpdateProviderJobStatusByIdPayloadType = z.infer<
  typeof providerJobStatusUpdateValidationSchema.shape.body
>
export type TProviderCompleteJobPayloadType = z.infer<
  typeof providerCompleteJobValidationSchema.shape.body
>
export type TCustomerDisputeJobPayloadType = z.infer<
  typeof customerDisputeJobValidationSchema.shape.body
>
