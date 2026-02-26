import { auth } from '@app/middlewares/auth'
import type { Router } from 'express'
import express from 'express'
import { AuthRoles } from 'packages/db/src'
import { walletController } from './wallet.controllers'

const router: Router = express.Router()

router.get('/me', auth(AuthRoles.PROVIDER), walletController.getWallet)

export const walletRoutes = router
