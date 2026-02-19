import { Document, Types } from 'mongoose'
import type { TransactionLedgerType } from './transaction-ledger.constant'

export type TTransactionLedgerType =
  (typeof TransactionLedgerType)[keyof typeof TransactionLedgerType]

export interface ITransactionLedger {
  user: Types.ObjectId
  job: Types.ObjectId
  type: TTransactionLedgerType
  amount: number
  reason?: string
  reference?: string
  createdAt: Date
  updatedAt: Date
  details: Record<string, unknown>
}
export interface ITransactionLedgerDocument extends ITransactionLedger, Document {}
