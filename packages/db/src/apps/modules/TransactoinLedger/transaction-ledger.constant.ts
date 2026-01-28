export const TransactionLedgerType = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
  REFUND: 'REFUND',
} as const

export const TransactionLedgerValues = Object.values(TransactionLedgerType)
