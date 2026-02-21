import { TransactionLedger } from '@repo/db'

import { QueryBuilder } from 'packages/shared/src'
import type { IGetAllTransactionLedgers } from './transactionLedger.validations'

const getAllTransactions = async (query: IGetAllTransactionLedgers) => {
  const { fromDate, toDate, ...filter } = query

  // Date filter
  const dateFilter: Record<string, Date> = {}
  if (fromDate) {
    dateFilter.$gte = new Date(fromDate)
  }
  if (toDate) {
    dateFilter.$lte = new Date(toDate)
  }

  // Base filter object
  const baseFilter: Record<string, unknown> = {}

  // Apply date filter if exists
  if (Object.keys(dateFilter).length > 0) {
    baseFilter.createdAt = dateFilter
  }

  const searableFields = ['reason']

  const TransactionLedgerQuery = new QueryBuilder(TransactionLedger.find(baseFilter), filter)
    .search(searableFields)
    .filter()
    .sort()
    .paginate()

  const data = await TransactionLedgerQuery.modelQuery
  const meta = await TransactionLedgerQuery.countTotal()

  return {
    data,
    meta,
  }
}

export const transactionLedgerServices = {
  getAllTransactions,
}
