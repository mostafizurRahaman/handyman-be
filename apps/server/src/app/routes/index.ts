import { adminRoutes } from '@app/modules/Admin/admin.route'
import { authRoutes } from '@app/modules/Auth/user.routes'
import { jobRoutes } from '@app/modules/Jobs/job.routes'
import { serviceCategory } from '@app/modules/ServiceCategory/service-category.routes'
import { subscriptionRoutes } from '@app/modules/Subscription/subscription.routes'
import { subscriptionPlanRoutes } from '@app/modules/SubscriptionPlan/subscripton-plan.routes'
import { verificationRoutes } from '@app/modules/Verification/verification.routes'
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
  {
    path: '/job',
    route: jobRoutes,
  },
  {
    path: '/verification',
    route: verificationRoutes,
  },
  {
    path: '/subscription-plan',
    route: subscriptionPlanRoutes,
  },
  {
    path: '/subscription',
    route: subscriptionRoutes,
  },
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
