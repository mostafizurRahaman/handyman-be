export const EscrowStatus = {
  LOCKED: 'LOCKED',
  RELEASED: 'RELEASED',
  FROZEN: 'FROZEN',
} as const

export const EscrowStatusValues = Object.values(EscrowStatus)
