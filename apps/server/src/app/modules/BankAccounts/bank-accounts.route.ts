import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'
import { bankAcccountControllers } from './bank-accounts.controllers'

const router: Router = express.Router()

router.get('/codes', auth(AuthRoles.PROVIDER), bankAcccountControllers.getBankCodes)

router.post('/add', auth(AuthRoles.PROVIDER), bankAcccountControllers.addBankAccount)

router.get('/all', auth(AuthRoles.PROVIDER), bankAcccountControllers.getProviderAllAccounts)

export const bankRoutes = router
