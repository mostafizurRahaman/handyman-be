import { Document, Types } from 'mongoose'
import type { TransactionLedgerType } from './transaction-ledger.constant'

export type TransactionLedgerType =
  (typeof TransactionLedgerType)[keyof typeof TransactionLedgerType]

export interface ITransactionLedger {
  user: Types.ObjectId
  job: Types.ObjectId
  type: TransactionLedgerType
  amount: number
  reason?: string
  reference?: string
  createdAt: Date
  updatedAt: Date
}
export interface ITransactionLedgerDocument extends ITransactionLedger, Document {}
