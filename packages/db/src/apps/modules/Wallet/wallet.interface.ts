import { Document, Types } from 'mongoose'

export interface IWallet {
  user: Types.ObjectId
  balance: number
  pendingBalance: number
  lifetimeIncome: number
}

export interface IWalletDocuements extends Document, IWallet {}
