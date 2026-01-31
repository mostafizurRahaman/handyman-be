import { optionalNumber, optionalString, requiredString } from '@repo/shared'
import z from 'zod'

// 1. create service category:
const createServiceCategorySchema = z.object({
  body: z.object({
    title: requiredString('Title'),
  }),
})

// 2. update service category:
const updateServiceCategorySchema = z.object({
  params: z.object({
    id: requiredString('Service Category ID'),
  }),
  body: z.object({
    title: requiredString('Title'),
  }),
})

// 3. get service category by id:
const getServiceCategoryByIdSchema = z.object({
  params: z.object({
    id: requiredString('Service Category ID'),
  }),
})

//4. delete service category by id:
const deleteServiceCategorySchema = z.object({
  params: z.object({
    id: requiredString('Service Category ID'),
  }),
})

// 5. get all service categories:

const getAllServiceCategoriesSchema = z.object({
  query: z.object({
    page: optionalNumber('Page'),
    limit: optionalNumber('Limit'),
    sort: optionalString('Sort'),
    searchTerm: optionalString('Search Term'),
    title: optionalString('Title'),
  }),
})
export const serviceCategoryValidations = {
  createServiceCategorySchema,
  updateServiceCategorySchema,
  getServiceCategoryByIdSchema,
  deleteServiceCategorySchema,
  getAllServiceCategoriesSchema,
}

// export types:
export type ICreateServiceCategoryType = z.infer<typeof createServiceCategorySchema>['body']
export type IUpdateServiceCategoryType = z.infer<typeof updateServiceCategorySchema.shape.body>
export type IUpdateServiceCategoryQueryType = z.infer<
  typeof updateServiceCategorySchema.shape.params
>
export type IGetServiceCategoryByIdType = z.infer<typeof getServiceCategoryByIdSchema>['params']
export type IDeleteServiceCategoryType = z.infer<typeof deleteServiceCategorySchema>['params']
export type IGetAllServiceCategoriesQueryType = z.infer<
  typeof getAllServiceCategoriesSchema
>['query']
