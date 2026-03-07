import { model, Schema, Types } from 'mongoose'
import type { IContactInformationDocuments } from './contact-information.interface'

export const IContactInformationSchema = new Schema<IContactInformationDocuments>(
  {
    email: {
      type: String,
      required: true,
    },
    phoneNumber: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    facebook: {
      type: String,
    },
    instagram: {
      type: String,
    },
    twitter: {
      type: String,
    },
    linkedin: {
      type: String,
    },
    youtube: {
      type: String,
    },
    updatedBy: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const ContactInformation = model<IContactInformationDocuments>(
  'ContactInformation',
  IContactInformationSchema
)
