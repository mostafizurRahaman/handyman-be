export const JobApplicationStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
} as const

export const JobApplicationStatusValues = Object.values(JobApplicationStatus)
