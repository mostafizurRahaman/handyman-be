export const subscriptionIntervals = {
  MONTHLY: 'monthly',
  YEARLY: 'annually',
} as const

export const subscriptionOptions = {
  ELITE: 'ELITE',
  PRO: 'PRO',
} as const

export const subscriptionIntervalValues = Object.values(subscriptionIntervals)

export const subscriptionOptionValues = Object.values(subscriptionOptions)
