import { ContactInformation, type IUser } from 'packages/db/src'
import type { TUpdateContactInformationPayload } from './contact-information.validations'

const updateOrCreateContactInformation = async (
  user: IUser,
  payload: TUpdateContactInformationPayload
) => {
  const contactInformation = await ContactInformation.findOneAndUpdate(
    {},
    {
      ...payload,
      updatedBy: user?._id,
    },
    {
      new: true,
      upsert: true,
    }
  )

  return contactInformation
}

const getContactInformation = async () => {
  const contactInformation = await ContactInformation.findOne({})

  return contactInformation
}

export const contactInfoServices = {
  updateOrCreateContactInformation,
  getContactInformation,
}
