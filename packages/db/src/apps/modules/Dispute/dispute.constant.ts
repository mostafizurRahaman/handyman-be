export const DisputeStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
} as const

export const disputeValues = Object.values(DisputeStatus)

export type TDisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus]
