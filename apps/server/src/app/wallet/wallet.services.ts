import { AuthRoles, type IUser } from '@repo/db'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'

const getMyWallet = async (user: IUser) => {
  if (user?.role !== AuthRoles.PROVIDER) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Only provider has wallet!')
  }


//   Check 




}

export const walletServices = {
  getMyWallet,
}
