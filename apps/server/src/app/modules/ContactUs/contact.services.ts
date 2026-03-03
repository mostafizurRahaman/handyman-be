import { Contact } from '@repo/db'
import type { ICreateContact, TGetAllContactQuery } from './contact.validations'
import { QueryBuilder } from 'packages/shared/src'

const createContact = async (payload: ICreateContact) => {
  const contact = await Contact.create(payload)

  return contact
}

const getAllContacts = async (query: TGetAllContactQuery) => {
  const { fromDate, toDate, ...fitlerQuery } = query

  const searchableFields = ['fullName', 'email', 'message']

  const baseQuery: Record<string, unknown> = {}

  if (fromDate || toDate) {
    const dateFilter: Record<string, unknown> = {}
    if (fromDate) {
      dateFilter.$gte = new Date(fromDate)
    }
    if (toDate) {
      dateFilter.$lte = new Date(toDate)
    }

    baseQuery.createdAt = dateFilter
  }

  const contactQuery = new QueryBuilder(Contact.find(baseQuery), fitlerQuery)
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()

  const data = await contactQuery.modelQuery
  const meta = await contactQuery.countTotal()
  return {
    data,
    meta,
  }
}

export const contactServices = {
  createContact,
  getAllContacts,
}
