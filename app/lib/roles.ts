import { UserRole } from '@/app/generated/prisma'

export { UserRole }

export const REGISTERABLE_ROLES = [
  UserRole.PATIENT,
  UserRole.DOCTOR,
  UserRole.SPECIALIST,
  UserRole.LAB_STAFF,
  UserRole.PHARMACY_STAFF,
] as const
export type RegisterableRole = (typeof REGISTERABLE_ROLES)[number]

export const USER_ROLES = [
  UserRole.SUPER_ADMIN,
  UserRole.PATIENT,
  UserRole.DOCTOR,
  UserRole.SPECIALIST,
  UserRole.LAB_STAFF,
  UserRole.PHARMACY_STAFF,
] as const

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  PATIENT: 'Patient',
  DOCTOR: 'Doctor',
  SPECIALIST: 'Specialist',
  LAB_STAFF: 'Lab Staff',
  PHARMACY_STAFF: 'Pharmacy Staff',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  SUPER_ADMIN: 'from-violet-500 to-purple-600',
  PATIENT: 'from-blue-500 to-cyan-500',
  DOCTOR: 'from-emerald-500 to-teal-500',
  SPECIALIST: 'from-orange-500 to-amber-500',
  LAB_STAFF: 'from-pink-500 to-rose-500',
  PHARMACY_STAFF: 'from-indigo-500 to-blue-500',
}
