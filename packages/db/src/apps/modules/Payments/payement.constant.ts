export const PaymentStatus = {
  INITIALIZED: 'INITIALIZED',
  HELD: 'HELD',
  FAILED: 'FAILED',
  RELEASED: 'RELEASED',
  REFUNDED: 'REFUNDED',
} as const

export const PaymentStatusValues = Object.values(PaymentStatus)
