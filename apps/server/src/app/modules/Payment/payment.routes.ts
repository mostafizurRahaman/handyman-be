import { auth } from '@app/middlewares/auth'
import express, { Router } from 'express'
import { AuthRoles } from 'packages/db/src'

const router: Router = express.Router()

router.get('/all', auth(AuthRoles.ADMIN, AuthRoles.SUPER_ADMIN),  )
