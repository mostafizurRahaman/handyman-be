import { model, Schema } from 'mongoose'
import type { IContactDocuments } from './contact-us.interface'

export const contactSchema = new Schema<IContactDocuments>(
  {
    message: {
      type: String,
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const Contact = model<IContactDocuments>('Contact', contactSchema)
