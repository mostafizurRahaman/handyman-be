export const SubscriptionStatus = {
  ACTIVE: 'active',
  NON_RENEWING: 'non-renewing',
  ATTENTION: 'attention',
  CANCELLED: 'cancelled',
} as const

export const ChargeType = {
  SUBSCRIPTION: 'subscription',
  PAYMENT: 'payment',
} as const

export const SubscriptionStatusValues = Object.values(SubscriptionStatus)

export const chargeTypeValues = Object.values(SubscriptionStatus)
