import { Document, Types } from 'mongoose'

export interface IProvider extends Document {
  user: Types.ObjectId
  serviceCategory: Types.ObjectId
  location: string
  lat: number
  long: number
  startTime: Date
  endTime: Date
  weekdays: string[]
  createdAt: Date
  updatedAt: Date
}
