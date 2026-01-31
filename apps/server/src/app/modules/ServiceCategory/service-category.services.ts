import { AppError, getSlug } from 'packages/shared/src'
import type {
  ICreateServiceCategoryType,
  IUpdateServiceCategoryType,
} from './service-category.validations'
import httpStatus from 'http-status'
import { ServiceCategory } from 'packages/db/src/apps/modules/ServiceCategory/service-category.model'

// 1. create service category:
const createCategory = async (payload: ICreateServiceCategoryType) => {
  const { title } = payload

  // 2. Generate slug:
  const slug = getSlug(title as string)

  // 3. return data:
  const isExists = await ServiceCategory.findOne({ slug })
  if (isExists) {
    throw new AppError(httpStatus.CONFLICT, 'Service Category with this title already exists')
  }

  const serviceCategory = await ServiceCategory.create({
    title,
    slug,
    createdBy,
  })

  return serviceCategory
}

// 2. update service category:
const updateCategory = async (id: string, payload: IUpdateServiceCategoryType) => {
  const { title } = payload

  // 2. Generate slug:
  const slug = getSlug(title as string)

  // 3. return data:
  const isExists = await ServiceCategory.findOne({ slug })
  if (isExists) {
    throw new AppError(httpStatus.CONFLICT, 'Service Category with this title already exists')
  }

  const serviceCategory = await ServiceCategory.findOneAndUpdate(
    {
      _id: id,
    },
    {
      title,
      slug,
    }
  )

  return serviceCategory
}

export const serviceCategoryServices = {
  createCategory,
  updateCategory,
  updateCategory,
}
