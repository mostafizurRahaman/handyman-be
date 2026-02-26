export const PaymentStatus = {
  INITIALIZED: 'INITIALIZED',
  HELD: 'HELD',
  FAILED: 'FAILED',
  RELEASED: 'RELEASED',
  REFUNDED: 'REFUNDED',
  REFUND_PENDING: 'REFUND_PENDING',
} as const

export const PaymentStatusValues = Object.values(PaymentStatus)
