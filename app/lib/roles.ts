import { UserRole } from '@/app/generated/prisma'

export { UserRole }

// Roles a user may self-register as. Super admin is assigned manually only.
export const REGISTERABLE_ROLES = [
  UserRole.PATIENT,
  UserRole.DOCTOR,
  UserRole.SPECIALIST,
] as const
export type RegisterableRole = (typeof REGISTERABLE_ROLES)[number]

export const USER_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.PATIENT,
  UserRole.DOCTOR,
  UserRole.SPECIALIST,
] as const

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  PATIENT: 'Patient',
  DOCTOR: 'Doctor',
  SPECIALIST: 'Specialist',
}
