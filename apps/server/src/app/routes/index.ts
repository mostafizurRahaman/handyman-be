import { adminRoutes } from '@app/modules/Admin/admin.route'
import { authRoutes } from '@app/modules/Auth/user.routes'
import { bankRoutes } from '@app/modules/BankAccounts/bank-accounts.route'
import { contentRoutes } from '@app/modules/Content/content.route'
import { disputeRoutes } from '@app/modules/Dispute/dispute.routes'
import { faqRoutes } from '@app/modules/Faq/faq.routes'
import { jobApplicationRoutes } from '@app/modules/JobApplication/job-application.routes'
import { jobRoutes } from '@app/modules/Jobs/job.routes'
import { providerRoutes } from '@app/modules/Provider/provider.route'
import { reviewRoutes } from '@app/modules/Reviews/reviews.routes'
import { serviceCategory } from '@app/modules/ServiceCategory/service-category.routes'
import { subscriptionRoutes } from '@app/modules/Subscription/subscription.routes'
import { subscriptionPlanRoutes } from '@app/modules/SubscriptionPlan/subscripton-plan.routes'
import { transactionLedgerRoutes } from '@app/modules/transactionsLedger/transactionLedger.routes'
import { userRoutes } from '@app/modules/Users/users.route'
import { verificationRoutes } from '@app/modules/Verification/verification.routes'
import { walletRoutes } from '@app/modules/wallet/wallet.routes'
import express, { Router } from 'express'
import { chatRoutes } from '@app/modules/Chat/chat.routes'
import { payoutRoutes } from '@app/modules/Payout/payout.routes'
import { paymentRoutes } from '@app/modules/Payment/payment.routes'
import { notificationRoutes } from '@app/modules/Notification/notification.routes'
import { contactRoutes } from '@app/modules/ContactUs/contact.routes'
import { contactInfoRoutes } from '@app/modules/ContactInformation/contact-information.routes'

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
  {
    path: '/transaction',
    route: transactionLedgerRoutes,
  },
  {
    path: '/dispute',
    route: disputeRoutes,
  },
  {
    path: '/chat',
    route: chatRoutes,
  },
  {
    path: '/content',
    route: contentRoutes,
  },
  {
    path: '/faq',
    route: faqRoutes,
  },
  {
    path: '/payout',
    route: payoutRoutes,
  },
  {
    path: '/payment',
    route: paymentRoutes,
  },
  {
    path: '/notification',
    route: notificationRoutes,
  },
  {
    path: '/contact',
    route: contactRoutes,
  },
  {
    path: '/contact-info',
    route: contactInfoRoutes,
  },
]

routes.forEach((route) => router.use(route.path, route.route))

export const allRoutes = router
