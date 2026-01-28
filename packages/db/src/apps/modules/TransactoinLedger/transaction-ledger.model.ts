import { Schema, model } from 'mongoose'
import type { ITransactionLedger } from './transaction-ledger.interface'
import { TransactionLedgerValues } from './transaction-ledger.constant'

const transactionLedgerSchema = new Schema<ITransactionLedger>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    type: {
      type: String,
      required: true,
      enum: TransactionLedgerValues,
    },
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
    },
    reference: {
      type: String,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
)

export const TransactionLedger = model<ITransactionLedger>(
  'TransactionLedger',
  transactionLedgerSchema
)
