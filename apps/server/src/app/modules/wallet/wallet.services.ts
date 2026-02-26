import { AuthRoles, Wallet, type IUser } from '@repo/db'
import { AppError } from '@repo/shared'
import httpStatus from 'http-status'

const getMyWallet = async (user: IUser) => {
  if (user?.role !== AuthRoles.PROVIDER) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Only provider has wallet!')
  }

  // Check wallet balance:
  const wallet = await Wallet.findOne({
    user: user?._id,
  }).lean()

  if (!wallet) {
    return {
      pendingBalance: 0,
      lifetimeIncome: 0,
      balance: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
  }

  return {
    ...wallet,
    pendingBalance: wallet.pendingBalance / 100,
    lifetimeIncome: wallet.lifetimeIncome / 100,
    balance: wallet.balance / 100,
  }
}

export const walletServices = {
  getMyWallet,
}
