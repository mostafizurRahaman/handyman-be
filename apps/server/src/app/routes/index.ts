import { adminRoutes } from '@app/modules/Admin/admin.route'
import { authRoutes } from '@app/modules/Auth/user.routes'
import { serviceCategory } from '@app/modules/ServiceCategory/service-category.routes'
import express, { Router } from 'express'

const router: Router = express.Router()

const routes = [
  {
    path: '/auth',
    route: authRoutes,
  },
  {
    path: '/admin',
    route: adminRoutes,
  },
  {
    path: '/category',
    route: serviceCategory,
  },
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
