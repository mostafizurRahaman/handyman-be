import {
  optionalDate,
  optionalEnumString,
  optionalNumber,
  optionalString,
  requiredNumber,
  requiredString,
  sortingValues,
} from '@repo/shared'
import { JobStatusValues } from '@repo/db'
import z from 'zod'

// 1. create job
const createJobSchema = z.object({
  body: z.object({
    category: requiredString('Category'),
    title: requiredString('Title'),
    description: optionalString('Description'),
    location: requiredString('Location'),
    lat: requiredNumber('Latitude'),
    long: requiredNumber('Longitude'),
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
  body: z.object({
    category: requiredString('Category'),
    title: requiredString('Title'),
    description: optionalString('Description'),
    location: requiredString('Location'),
    lat: requiredNumber('Latitude'),
    long: requiredNumber('Longitude'),
    price: requiredNumber('Price').default(0),
    prefferedDate: requiredString('Preffered Date'),
    prefferedTime: requiredString('Preffered Time'),
  }),
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
export const jobValidationSchemas = {
  createJobSchema,
  updateJobSchema,
  deleteJobSchema,
  getSingleJobSchema,
  getCustomerAllJobs,
  addImageIntoJobSchema,
  removeImageFromJobSchema,
}

export type TCreateJobType = z.infer<typeof createJobSchema.shape.body>
export type TGetCustomerAllJobsQueryType = z.infer<typeof getCustomerAllJobs.shape.query>
