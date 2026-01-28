import type { Document, Types } from 'mongoose'

export interface IServiceCategory {
  title: string
  image: string
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export interface IServiceCategoryDocument extends IServiceCategory, Document {}
