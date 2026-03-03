import type { Document } from 'mongoose'

export interface IContactUs {
  fullName: string
  email: string
  message: string
}

export interface IContactDocuments extends IContactUs, Document {}
