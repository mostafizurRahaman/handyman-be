#!/usr/bin/env node

const fs = require('fs')
const path = require('path')

const moduleName = process.argv[2]

if (!moduleName) {
  console.error('❌ Module name is required')
  console.log('👉 Example: node make-module.js SubscriptionPlan')
  process.exit(1)
}

/* ---------------- HELPERS ---------------- */

const pascalToKebab = (str) => str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()

const kebab = pascalToKebab(moduleName)
const camel = moduleName.charAt(0).toLowerCase() + moduleName.slice(1)

/* ---------------- PATH ---------------- */

const baseDir = path.join(process.cwd(), 'apps/server/src/app/modules', moduleName)

if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true })
  console.log(`📁 Created: ${baseDir}`)
}

/* ---------------- FILE DEFINITIONS ---------------- */

const files = [
  {
    name: `${kebab}.controllers.ts`,
    content: controllerTemplate(moduleName, kebab, camel),
  },
  {
    name: `${kebab}.services.ts`,
    content: serviceTemplate(moduleName, kebab, camel),
  },
  {
    name: `${kebab}.validations.ts`,
    content: validationTemplate(moduleName),
  },
  {
    name: `${kebab}.routes.ts`,
    content: routeTemplate(moduleName, kebab, camel),
  },
]

files.forEach(({ name, content }) => {
  const filePath = path.join(baseDir, name)
  if (fs.existsSync(filePath)) {
    console.log(`⚠️ Skipped: ${name}`)
    return
  }
  fs.writeFileSync(filePath, content)
  console.log(`✅ Created: ${name}`)
})

console.log('🚀 Module generation completed!')

/* ================= TEMPLATES ================= */

function controllerTemplate(name, kebab, camel) {
  return `import { catchAsync, sendResponse } from 'packages/shared/src'
import httpStatus from 'http-status'
import { ${camel}Service } from './${kebab}.services'

// 1. Create:
const create${name} = catchAsync(async (req, res) => {
  const result = await ${camel}Service.create(req.body)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: '${name} created successfully!',
    data: result,
  })
})

// 2. Get all:
const getAll${name}s = catchAsync(async (req, res) => {
  const result = await ${camel}Service.getAll(req.query)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: '${name}s retrieved successfully!',
    data: result.data,
    meta: result.meta,
  })
})

export const ${camel}Controller = {
  create${name},
  getAll${name}s,
}
`
}

function serviceTemplate(name, kebab, camel) {
  return `import httpStatus from 'http-status'
import { AppError, QueryBuilder } from 'packages/shared/src'
import { logger } from '@app/libs/logger'

// 1. Create:
const create = async (payload: any) => {
  try {
    return payload
  } catch (error: any) {
    logger.error('${name} create error', error)
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to create ${name}')
  }
}

// 2. Get all:
const getAll = async (query: any) => {
  const data = []
  const meta = { page: 1, limit: 10, total: 0 }

  return { data, meta }
}

export const ${camel}Service = {
  create,
  getAll,
}
`
}

function validationTemplate(name) {
  return `import z from 'zod'
import { optionalNumber, optionalString } from '@repo/shared'

// create ${name}:
const create${name}Schema = z.object({
  body: z.object({
    name: z.string().min(1, '${name} name is required'),
  }),
})

// query ${name}:
const ${name.toLowerCase()}QuerySchema = z.object({
  query: z.object({
    limit: optionalNumber('Limit'),
    page: optionalNumber('Page'),
    sort: optionalString('Sort'),
    searchTerm: optionalString('Search term'),
  }),
})

export const ${name.toLowerCase()}Validations = {
  create${name}Schema,
  ${name.toLowerCase()}QuerySchema,
}
`
}

function routeTemplate(name, kebab, camel) {
  return `import express, { Router } from 'express'
import { validateRequest } from '@app/middlewares'
import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'
import { ${name.toLowerCase()}Validations } from './${kebab}.validations'
import { ${camel}Controller } from './${kebab}.controllers'

const router: Router = express.Router()

router.post(
  '/create',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(${name.toLowerCase()}Validations.create${name}Schema),
  ${camel}Controller.create${name}
)

router.get(
  '/all',
  auth(AuthRoles.SUPER_ADMIN, AuthRoles.ADMIN),
  validateRequest(${name.toLowerCase()}Validations.${name.toLowerCase()}QuerySchema),
  ${camel}Controller.getAll${name}s
)

export const ${camel}Routes = router
`
}
