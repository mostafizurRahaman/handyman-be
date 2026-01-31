import { AppError, getSlug, QueryBuilder } from 'packages/shared/src'
import type {
  ICreateServiceCategoryType,
  IGetAllServiceCategoriesQueryType,
  IUpdateServiceCategoryType,
} from './service-category.validations'
import httpStatus from 'http-status'
import { ServiceCategory } from '@repo/db'
import type { IUser } from '@repo/db'
import { deleteSingleFileFromS3, uploadSingleFileToS3 } from 'packages/media-hub/src'

/* =====================================================
   1. CREATE SERVICE CATEGORY
===================================================== */
const createCategory = async (
  userInfo: IUser,
  payload: ICreateServiceCategoryType,
  file: Express.Multer.File
) => {
  const slug = getSlug(payload.title)

  if (!file) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Category Image is required!')
  }

  const isExists = await ServiceCategory.findOne({ slug })
  if (isExists) {
    throw new AppError(httpStatus.CONFLICT, 'Service Category with this title already exists')
  }

  const converImage = await uploadSingleFileToS3(file, 'categories')

  return await ServiceCategory.create({
    title: payload.title,
    slug,
    image: converImage.url,
    createdBy: userInfo._id,
  })
}

/* =====================================================
   2. GET SERVICE CATEGORY BY ID
===================================================== */
const getServiceCategoryById = async (id: string) => {
  const category = await ServiceCategory.findById(id).populate(
    'createdBy',
    'name email phoneNumber profileImage'
  )

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Service Category doesn't exist")
  }

  return category
}

/* =====================================================
   3. GET ALL SERVICE CATEGORIES
===================================================== */
const getAllServiceCategory = async (query: IGetAllServiceCategoriesQueryType) => {
  const searchableFields = ['title']

  const serviceCategoryQuery = new QueryBuilder(
    ServiceCategory.find().populate('createdBy', 'name email phoneNumber profileImage'),
    query
  )
    .search(searchableFields)
    .filter()
    .sort()
    .paginate()

  const data = await serviceCategoryQuery.modelQuery
  const meta = await serviceCategoryQuery.countTotal()

  return { data, meta }
}

/* =====================================================
   4. UPDATE SERVICE CATEGORY
===================================================== */
const updateCategory = async (
  id: string,
  payload: IUpdateServiceCategoryType,
  file: Express.Multer.File
) => {
  const existingCategory = await ServiceCategory.findById(id)

  if (!existingCategory) {
    throw new AppError(httpStatus.NOT_FOUND, "Service Category doesn't exist")
  }

  const slug = getSlug(payload.title)

  const isExists = await ServiceCategory.findOne({
    slug,
    _id: { $ne: id },
  })

  if (isExists) {
    throw new AppError(httpStatus.CONFLICT, 'Service Category with this title already exists')
  }

  if (file && existingCategory.image) {
    await deleteSingleFileFromS3(existingCategory.image)
  }

  const { url } = await uploadSingleFileToS3(file, 'categories')

  return await ServiceCategory.findByIdAndUpdate(
    id,
    { title: payload.title, slug, image: url ?? existingCategory?.image },
    { new: true, runValidators: true }
  )
}

/* =====================================================
   5. DELETE SERVICE CATEGORY
===================================================== */
const deleteServiceCategoryById = async (id: string) => {
  const deleted = await ServiceCategory.findByIdAndDelete(id)

  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, "Service Category doesn't exist")
  }

  await deleteSingleFileFromS3(deleted?.image)

  return deleted
}

/* =====================================================
   EXPORTS
===================================================== */
export const serviceCategoryServices = {
  createCategory,
  getServiceCategoryById,
  getAllServiceCategory,
  updateCategory,
  deleteServiceCategoryById,
}
