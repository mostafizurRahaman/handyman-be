import { catchAsync, sendResponse } from '@repo/shared'
import { serviceCategoryServices } from './service-category.services'
import httpStatus from 'http-status'

/**
 * @desc    Create a new service category
 * @route   POST /api/service-categories
 * @access  Private
 */
const createCategory = catchAsync(async (req, res) => {
  const user = req.user
  const payload = req.body
  const file = req.file as Express.Multer.File

  const result = await serviceCategoryServices.createCategory(user, payload, file)

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Service category created successfully!',
    data: result,
  })
})

/**
 * @desc    Get a single service category by ID
 * @route   GET /api/service-categories/:id
 * @access  Public
 */
const getServiceCategory = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const result = await serviceCategoryServices.getServiceCategoryById(id)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service category retrieved successfully!',
    data: result,
  })
})

/**
 * @desc    Get all service categories
 * @route   GET /api/service-categories
 * @access  Public
 */
const getAllServiceCategories = catchAsync(async (req, res) => {
  const result = await serviceCategoryServices.getAllServiceCategory(req.query)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service categories retrieved successfully!',
    data: result,
  })
})

/**
 * @desc    Update a service category by ID
 * @route   PATCH /api/service-categories/:id
 * @access  Private
 */
const updateCategory = catchAsync(async (req, res) => {
  const id = req.params.id as string
  const payload = req.body
  const file = req.file as Express.Multer.File

  const result = await serviceCategoryServices.updateCategory(id, payload, file)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service category updated successfully!',
    data: result,
  })
})

/**
 * @desc    Delete a service category by ID
 * @route   DELETE /api/service-categories/:id
 * @access  Private
 */
const deleteServiceCategory = catchAsync(async (req, res) => {
  const id = req.params.id as string

  const result = await serviceCategoryServices.deleteServiceCategoryById(id)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Service category deleted successfully!',
    data: result,
  })
})

export const serviceController = {
  createCategory,
  getServiceCategory,
  getAllServiceCategories,
  updateCategory,
  deleteServiceCategory,
}
