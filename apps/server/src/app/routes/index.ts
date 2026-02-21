import { adminRoutes } from '@app/modules/Admin/admin.route'
import { authRoutes } from '@app/modules/Auth/user.routes'
import { bankRoutes } from '@app/modules/BankAccounts/bank-accounts.route'
import { jobApplicationRoutes } from '@app/modules/JobApplication/job-application.routes'
import { jobRoutes } from '@app/modules/Jobs/job.routes'
import { providerRoutes } from '@app/modules/Provider/provider.route'
import { reviewRoutes } from '@app/modules/Reviews/reviews.routes'
import { serviceCategory } from '@app/modules/ServiceCategory/service-category.routes'
import { subscriptionRoutes } from '@app/modules/Subscription/subscription.routes'
import { subscriptionPlanRoutes } from '@app/modules/SubscriptionPlan/subscripton-plan.routes'
import { userRoutes } from '@app/modules/Users/users.route'
import { verificationRoutes } from '@app/modules/Verification/verification.routes'
import { walletRoutes } from '@app/wallet/wallet.routes'
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
  {
    path: '/user',
    route: userRoutes,
  },
  {
    path: '/application',
    route: jobApplicationRoutes,
  },
  {
    path: '/bank-account',
    route: bankRoutes,
  },
  {
    path: '/provider',
    route: providerRoutes,
  },
  {
    path: '/review',
    route: reviewRoutes,
  },
  {
    path: '/wallet',
    route: walletRoutes,
  },
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
