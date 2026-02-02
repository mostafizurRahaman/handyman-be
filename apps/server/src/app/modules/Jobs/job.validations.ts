import { optionalNumber, optionalString, requiredNumber, requiredString } from '@repo/shared'
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
    aggreedPrice: optionalNumber('Aggreed Price').default(0),
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

// 3. get Single Job:
const getSingleJobSchema = z.object({
  params: z.object({
    id: requiredString('Job ID'),
  }),
})

export const jobValidationSchemas = {
  createJobSchema,
  updateJobSchema,
  deleteJobSchema,
  getSingleJobSchema,
}

export type TCreateJobType = z.infer<typeof createJobSchema.shape.body>
