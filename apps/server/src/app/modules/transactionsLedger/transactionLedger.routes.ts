import type { Router } from 'express'

import express from 'express'
import { transactionController } from './transactionsLedger.controllers'

import { auth } from '@app/middlewares/auth'
import { AuthRoles } from 'packages/db/src'
import { validateRequest } from '@app/middlewares'
import { transactionLedgerValidations } from './transactionLedger.validations'

const router: Router = express.Router()

router.get(
  '/all',
  auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN, AuthRoles.PROVIDER, AuthRoles.CUSTOMER),
  validateRequest(transactionLedgerValidations.getAllTransactionLedgers),
  transactionController.getAllTransactions
)

export const transactionLedgerRoutes = router
