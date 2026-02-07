import type { Request } from 'express'
import type { IUser } from '@repo/db'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'

export const getUserFromRequest = (req: Request): IUser => {
  const user = req.user
  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User doesn't exists")
  }
  return user
}
