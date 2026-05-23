import { Document, Types } from 'mongoose'
import type { GetLocationPoints } from './provider.constant'
export interface IGeoPoint {
  type: (typeof GetLocationPoints)[keyof typeof GetLocationPoints]
  coordinates: [number, number] // [long, lat]
}

export interface IProvider extends Document {
  user: Types.ObjectId
  serviceCategory: Types.ObjectId
  address: string
  location: IGeoPoint
  city: string
  startTime: Date
  endTime: Date
  weekdays: string[]
  createdAt: Date
  updatedAt: Date
}
