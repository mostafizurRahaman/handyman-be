export const SubscriptionStatus = {
  ACTIVE: 'active',
  NON_RENEWING: 'non-renewing',
  ATTENTION: 'attention',
  CANCELLED: 'cancelled',
} as const

export const SubscriptionStatusValues = Object.values(SubscriptionStatus)
