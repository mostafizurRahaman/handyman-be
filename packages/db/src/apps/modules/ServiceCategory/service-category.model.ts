import { model, Schema } from 'mongoose'
import type { IServiceCategoryDocument } from './service-category.interface'

const ServiceCategorySchema = new Schema<IServiceCategoryDocument>(
  {
    title: {
      type: String,
      required: true,
    },
    image: {
      type: String,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
)

export const ServiceCategory = model<IServiceCategoryDocument>(
  'ServiceCategory',
  ServiceCategorySchema
)
