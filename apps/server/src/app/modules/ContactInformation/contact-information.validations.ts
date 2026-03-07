import { NGN_PHONE_NUMBER_REGEX, requiredEmail, requiredString } from '@repo/shared'
import z from 'zod'

const updateContactInformation = z.object({
  body: z
    .object({
      email: requiredEmail('Email'),
      phoneNumber: z
        .string({
          error: 'Phone number is required!',
        })
        .regex(NGN_PHONE_NUMBER_REGEX),
      address: requiredString('Address'),
      facebook: requiredString('Facebook URL').url('URL should be valid!').optional().nullable(),
      instagram: requiredString('Instagram URL').url('URL should be valid!').optional().nullable(),
      twitter: requiredString('Twitter URL').url('URL should be valid!').optional().nullable(),
      youtube: requiredString('Youtube URL').url('URL should be valid!').optional().nullable(),
      linkedin: requiredString('Linkedin URL').url('URL should be valid!').optional().nullable(),
    })
    .partial(),
})

export const contactInformationValications = {
  updateContactInformation,
}

export type TUpdateContactInformationPayload = z.infer<typeof updateContactInformation.shape.body>
