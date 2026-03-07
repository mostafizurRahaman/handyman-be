import type { Document, Types } from 'mongoose'

export interface IContactInformation {
  email: string
  phoneNumber: string
  address: string
  facebook: string
  youtube: string
  linkedin: string
  instagram: string
  twitter: string
  updatedBy: Types.ObjectId
}

export interface IContactInformationDocuments extends IContactInformation, Document {}
