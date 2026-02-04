export const VerificationStatus = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  DECLINED: 'declined',
} as const

export const verificationStatusValues = Object.values(VerificationStatus)
