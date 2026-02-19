
export const DisputeStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  REJECTED: 'REJECTED',
} as const

export type TDisputeStatus = (typeof DisputeStatus)[keyof typeof DisputeStatus]

