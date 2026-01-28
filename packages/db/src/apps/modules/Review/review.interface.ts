import { Document, Types } from 'mongoose'

export interface IReview {
  job: Types.ObjectId
  provider: Types.ObjectId
  customer: Types.ObjectId
  star: number
  comment?: string
  createdAt: Date
  updatedAt: Date
}

export interface IReviewDocument extends IReview, Document {}
