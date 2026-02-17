import { model, Schema } from 'mongoose'
import type { IWallet } from './wallet.interface'

const walletSchema = new Schema<IWallet>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    balance: {
      type: Number, // store in kobo (integer)
      required: true,
      default: 0,
    },
    lifetimeIncome: {
      type: Number, // store in kobo (integer)
      required: true,
      default: 0,
    },
    pendingBalance: {
      type: Number, // store in kobo (integer)
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const Wallet = model<IWallet>('Wallet', walletSchema)
