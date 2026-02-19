export const JobStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  ENROUTE: 'enroute',
  STARTED: 'started',
  COMPLETED: 'completed',
  CLOSED: 'closed',
  DISPUTE: 'dispute',
} as const

export const JobStatusValues = Object.values(JobStatus)
