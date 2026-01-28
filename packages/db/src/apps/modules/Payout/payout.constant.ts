export const PayoutStatus = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  SUCCESS: 'success',
  FAILED: 'failed',
} as const

export const PayoutStatusValues = Object.values(PayoutStatus)
