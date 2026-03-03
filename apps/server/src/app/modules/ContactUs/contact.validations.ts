import {
  optionalDate,
  optionalNumber,
  optionalString,
  requiredDate,
  requiredEmail,
  requiredNumber,
  requiredString,
} from 'packages/shared/src'
import z from 'zod'

export const createContactSchema = z.object({
  body: z.object({
    message: requiredString('Message'),
    fullName: requiredString('Full Name'),
    email: requiredEmail('Email'),
  }),
})

const getAllContactSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    searchTerm: optionalString('Search Term'),
    fromDate: optionalDate(`From date`),
    toDate: optionalDate(`To date`),
    sortBy: optionalString('Sort By'),
  }),
})

export const contactValidations = {
  createContactSchema,
  getAllContactSchema,
}

export type ICreateContact = z.infer<typeof createContactSchema.shape.body>
export type TGetAllContactQuery = z.infer<typeof getAllContactSchema.shape.query>
