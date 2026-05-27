'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { Gender, UserRole } from '@/app/generated/prisma'
import { prisma, ready } from '@/app/lib/prisma'
import { USER_ROLES } from '@/app/lib/roles'
import { getSession } from '@/app/lib/session'

export type AdminActionState =
  | { success?: boolean; message?: string }
  | undefined

export type AdminUserRow = {
  id: number
  username: string
  email: string | null
  role: UserRole
  isActive: boolean
  createdAt: string
  plainPassword: string | null
}

export type HospitalOption = {
  id: number
  name: string
  shortName: string
  city: string
}

export type CreateUserState =
  | {
      success?: boolean
      message?: string
      user?: AdminUserRow
      errors?: Record<string, string[] | undefined>
    }
  | undefined

type CreateUserPayload = Record<string, string | undefined>

const STAFF_ROLES = [
  UserRole.DOCTOR,
  UserRole.SPECIALIST,
  UserRole.LAB_STAFF,
  UserRole.PHARMACY_STAFF,
] as const

const userRowSelect = {
  id: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  plainPassword: true,
} as const

const optionalString = (max: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().max(max, `Must be at most ${max} characters.`).optional(),
  )

const optionalPositiveInt = z.preprocess(
  (value) => {
    if (typeof value !== 'string' || value.trim() === '') return undefined
    const numberValue = Number(value)
    return Number.isFinite(numberValue) ? numberValue : value
  },
  z.number().int().positive().optional(),
)

const CreateUserSchema = z.object({
  username: z
    .preprocess(
      (value) => (typeof value === 'string' ? value.trim() : value),
      z
        .string()
        .min(3, 'Username must be at least 3 characters.')
        .max(64, 'Username must be at most 64 characters.')
        .regex(/^[a-zA-Z0-9_.-]+$/, 'Only letters, numbers, "_", ".", "-" allowed.'),
    )
    .transform((value) => value.toLowerCase()),
  email: z
    .preprocess(
      (value) => (typeof value === 'string' ? value.trim() : value),
      z.string().email('Enter a valid email.').max(120, 'Email must be at most 120 characters.'),
    )
    .transform((value) => value.toLowerCase()),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters.')
    .max(200, 'Password is too long.'),
  role: z.enum(USER_ROLES),
  isActive: z.enum(['true', 'false']).transform((value) => value === 'true'),
  patientFullName: optionalString(160),
  uniId: optionalString(32),
  gender: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.enum([Gender.MALE, Gender.FEMALE]).optional(),
  ),
  dob: optionalString(10),
  phoneNumber: optionalString(32),
  faculty: optionalString(80),
  visitHospitalName: optionalString(180),
  visitClinicName: optionalString(120),
  visitDoctorName: optionalString(160),
  visitDate: optionalString(10),
  visitSummary: optionalString(240),
  visitNotes: optionalString(1000),
  staffFullName: optionalString(160),
  staffTitle: optionalString(120),
  specialization: optionalString(120),
  department: optionalString(120),
  labSection: optionalString(120),
  hospitalId: optionalPositiveInt,
}).superRefine((data, ctx) => {
  if (data.role === UserRole.PATIENT) {
    if (!data.patientFullName) {
      ctx.addIssue({ code: 'custom', path: ['patientFullName'], message: 'Full name is required.' })
    }
    if (!data.uniId) {
      ctx.addIssue({ code: 'custom', path: ['uniId'], message: 'University ID is required.' })
    }
    if (!data.gender) {
      ctx.addIssue({ code: 'custom', path: ['gender'], message: 'Gender is required.' })
    }
    if (!data.dob) {
      ctx.addIssue({ code: 'custom', path: ['dob'], message: 'Date of birth is required.' })
    }
  }

  if (STAFF_ROLES.includes(data.role as (typeof STAFF_ROLES)[number])) {
    if (!data.staffFullName) {
      ctx.addIssue({ code: 'custom', path: ['staffFullName'], message: 'Full name is required.' })
    }
    if (!data.staffTitle) {
      ctx.addIssue({ code: 'custom', path: ['staffTitle'], message: 'Title is required.' })
    }
    if (data.role === UserRole.SPECIALIST && !data.hospitalId) {
      ctx.addIssue({ code: 'custom', path: ['hospitalId'], message: 'Choose a hospital for the specialist.' })
    }
  }

  const hasVisit = Boolean(
    data.visitHospitalName ||
    data.visitClinicName ||
    data.visitDoctorName ||
    data.visitDate ||
    data.visitSummary ||
    data.visitNotes,
  )
  if (hasVisit) {
    if (!data.visitHospitalName) {
      ctx.addIssue({ code: 'custom', path: ['visitHospitalName'], message: 'Visit hospital is required.' })
    }
    if (!data.visitClinicName) {
      ctx.addIssue({ code: 'custom', path: ['visitClinicName'], message: 'Visit clinic is required.' })
    }
    if (!data.visitDoctorName) {
      ctx.addIssue({ code: 'custom', path: ['visitDoctorName'], message: 'Visit doctor is required.' })
    }
    if (!data.visitDate) {
      ctx.addIssue({ code: 'custom', path: ['visitDate'], message: 'Visit date is required.' })
    }
    if (!data.visitSummary) {
      ctx.addIssue({ code: 'custom', path: ['visitSummary'], message: 'Visit summary is required.' })
    }
  }
})

function parseInputDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`)
}

function toAdminUserRow(user: {
  id: number
  username: string
  email: string | null
  role: UserRole
  isActive: boolean
  createdAt: Date
  plainPassword: string | null
}): AdminUserRow {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt.toISOString(),
    plainPassword: user.plainPassword,
  }
}

function formValue(source: FormData | CreateUserPayload, key: string) {
  const value = source instanceof FormData ? source.get(key) : source[key]
  return typeof value === 'string' ? value : undefined
}

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== UserRole.SUPER_ADMIN) {
    throw new Error('Forbidden')
  }
  return session
}

export async function createUser(
  _state: CreateUserState,
  formData: FormData | CreateUserPayload,
): Promise<CreateUserState> {
  await requireAdmin()

  const parsed = CreateUserSchema.safeParse({
    username: formValue(formData, 'username'),
    email: formValue(formData, 'email'),
    password: formValue(formData, 'password'),
    role: formValue(formData, 'role'),
    isActive: formValue(formData, 'isActive') || 'true',
    patientFullName: formValue(formData, 'patientFullName'),
    uniId: formValue(formData, 'uniId'),
    gender: formValue(formData, 'gender'),
    dob: formValue(formData, 'dob'),
    phoneNumber: formValue(formData, 'phoneNumber'),
    faculty: formValue(formData, 'faculty'),
    visitHospitalName: formValue(formData, 'visitHospitalName'),
    visitClinicName: formValue(formData, 'visitClinicName'),
    visitDoctorName: formValue(formData, 'visitDoctorName'),
    visitDate: formValue(formData, 'visitDate'),
    visitSummary: formValue(formData, 'visitSummary'),
    visitNotes: formValue(formData, 'visitNotes'),
    staffFullName: formValue(formData, 'staffFullName'),
    staffTitle: formValue(formData, 'staffTitle'),
    specialization: formValue(formData, 'specialization'),
    department: formValue(formData, 'department'),
    labSection: formValue(formData, 'labSection'),
    hospitalId: formValue(formData, 'hospitalId'),
  })

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }

  const data = parsed.data

  try {
    await ready()

    const [existingUsername, existingEmail, existingUniId, selectedHospital] = await Promise.all([
      prisma.user.findFirst({
        where: { username: { equals: data.username, mode: 'insensitive' } },
        select: { id: true },
      }),
      prisma.user.findFirst({
        where: { email: { equals: data.email, mode: 'insensitive' } },
        select: { id: true },
      }),
      data.role === UserRole.PATIENT && data.uniId
        ? prisma.patientProfile.findFirst({
            where: { uniId: { equals: data.uniId, mode: 'insensitive' } },
            select: { id: true },
          })
        : Promise.resolve(null),
      data.hospitalId
        ? prisma.hospital.findUnique({ where: { id: data.hospitalId }, select: { id: true } })
        : Promise.resolve(null),
    ])

    const errors: Record<string, string[]> = {}
    if (existingUsername) errors.username = ['Username is already taken.']
    if (existingEmail) errors.email = ['Email is already assigned to another user.']
    if (existingUniId) errors.uniId = ['University ID is already assigned to another patient.']
    if (data.hospitalId && !selectedHospital) errors.hospitalId = ['Choose an existing hospital.']
    if (Object.keys(errors).length > 0) return { errors }

    const passwordHash = await bcrypt.hash(data.password, 10)
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          username: data.username,
          email: data.email,
          passwordHash,
          plainPassword: data.password,
          role: data.role,
          isActive: data.isActive,
        },
        select: userRowSelect,
      })

      if (data.role === UserRole.PATIENT) {
        const patient = await tx.patientProfile.create({
          data: {
            userId: createdUser.id,
            fullName: data.patientFullName!,
            uniId: data.uniId!,
            gender: data.gender!,
            dob: parseInputDate(data.dob!),
            phoneNumber: data.phoneNumber ?? null,
            faculty: data.faculty ?? null,
          },
          select: { id: true },
        })

        if (
          data.visitHospitalName &&
          data.visitClinicName &&
          data.visitDoctorName &&
          data.visitDate &&
          data.visitSummary
        ) {
          await tx.patientVisit.create({
            data: {
              patientId: patient.id,
              hospitalName: data.visitHospitalName,
              clinicName: data.visitClinicName,
              doctorName: data.visitDoctorName,
              visitedAt: parseInputDate(data.visitDate),
              summary: data.visitSummary,
              notes: data.visitNotes ?? '',
            },
          })
        }
      } else if (STAFF_ROLES.includes(data.role as (typeof STAFF_ROLES)[number])) {
        await tx.staffProfile.create({
          data: {
            userId: createdUser.id,
            fullName: data.staffFullName!,
            title: data.staffTitle!,
            specialization: data.specialization ?? null,
            department: data.department ?? null,
            labSection: data.labSection ?? null,
            hospitalId: data.hospitalId ?? null,
          },
        })
      }

      return createdUser
    })

    revalidatePath('/dashboard/users')
    revalidatePath('/dashboard')

    return {
      success: true,
      message: 'User created.',
      user: toAdminUserRow(user),
    }
  } catch (err) {
    console.error('admin create user failed', err)
    return { message: 'Something went wrong while creating the user.' }
  }
}

export async function toggleUserActive(userId: number) {
  await requireAdmin()
  await ready()
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, isActive: true } })
  if (!user) return { message: 'User not found.' }
  await prisma.user.update({ where: { id: userId }, data: { isActive: !user.isActive } })
  revalidatePath('/dashboard')
  return { success: true, message: user.isActive ? 'User frozen.' : 'User activated.' }
}

export async function changeUserRole(userId: number, newRole: UserRole) {
  await requireAdmin()
  await ready()
  await prisma.user.update({ where: { id: userId }, data: { role: newRole } })
  revalidatePath('/dashboard')
  return { success: true, message: 'Role updated.' }
}

export async function changeUserPassword(userId: number, newPassword: string) {
  await requireAdmin()
  await ready()
  if (newPassword.length < 4) return { message: 'Password too short.' }
  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.user.update({ where: { id: userId }, data: { passwordHash: hash, plainPassword: newPassword } })
  revalidatePath('/dashboard')
  return { success: true, message: 'Password changed.' }
}

export async function deleteUser(userId: number) {
  await requireAdmin()
  await ready()
  await prisma.user.delete({ where: { id: userId } })
  revalidatePath('/dashboard')
  return { success: true, message: 'User deleted.' }
}

export async function getAllUsers() {
  const session = await getSession()
  if (!session || session.role !== UserRole.SUPER_ADMIN) return []
  await ready()
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      plainPassword: true,
    },
  })
}

export async function getHospitalOptions(): Promise<HospitalOption[]> {
  await requireAdmin()
  await ready()
  return prisma.hospital.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      shortName: true,
      city: true,
    },
  })
}

export async function getUserDetails(userId: number) {
  await requireAdmin()
  await ready()
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      patientProfile: {
        include: {
          visits: { orderBy: { visitedAt: 'desc' } },
          referrals: { orderBy: { createdAt: 'desc' }, take: 10 },
        },
      },
      staffProfile: true,
      createdReferrals: { orderBy: { createdAt: 'desc' }, take: 10 },
      notifications: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
}

export async function getAdminStats() {
  await requireAdmin()
  await ready()

  const [
    totalUsers,
    totalReferrals,
    totalLabTests,
    totalPrescriptions,
    referralsByStatus,
    usersByRole,
    recentReferrals,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.referral.count(),
    prisma.labTest.count(),
    prisma.prescription.count(),
    prisma.referral.groupBy({ by: ['status'], _count: true }),
    prisma.user.groupBy({ by: ['role'], _count: true }),
    prisma.referral.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, status: true, createdAt: true },
    }),
  ])

  return {
    totalUsers,
    totalReferrals,
    totalLabTests,
    totalPrescriptions,
    referralsByStatus: referralsByStatus.map((r) => ({ status: r.status, count: r._count })),
    usersByRole: usersByRole.map((u) => ({ role: u.role, count: u._count })),
    recentReferrals: recentReferrals.map((r) => ({
      id: r.id,
      status: r.status,
      date: r.createdAt.toISOString().split('T')[0],
    })),
  }
}

// ─── Integration / Worker Config ─────────────────────────────────────────────

// Store in a global for simplicity (in production, use DB or Redis)
declare global {
  var __integrationConfig: {
    endpoints: { id: string; url: string; method: string; params: Record<string, string>; enabled: boolean; category: string }[]
    workerIntervalMs: number
    lastFetch: string | null
  } | undefined
}

function getIntegrationConfig() {
  if (!global.__integrationConfig) {
    global.__integrationConfig = {
      endpoints: [
        {
          id: 'students-api',
          url: '/api/integration/students',
          method: 'POST',
          params: { count: '2' },
          enabled: true,
          category: 'students',
        },
        {
          id: 'clinics-api',
          url: '/api/integration/clinics',
          method: 'POST',
          params: { limit: '2' },
          enabled: true,
          category: 'clinics',
        },
        {
          id: 'appointments-api',
          url: '/api/integration/appointments',
          method: 'POST',
          params: { limit: '2' },
          enabled: true,
          category: 'clinics',
        },
        {
          id: 'lab-tests-api',
          url: '/api/integration/lab-tests',
          method: 'POST',
          params: { limit: '2', status: 'PENDING' },
          enabled: true,
          category: 'labs',
        },
        {
          id: 'prescriptions-api',
          url: '/api/integration/prescriptions',
          method: 'POST',
          params: { limit: '2' },
          enabled: true,
          category: 'pharmacy',
        },
      ],
      workerIntervalMs: 3600000, // 1 hour
      lastFetch: null,
    }
  }
  return global.__integrationConfig
}

export async function getIntegrationSettings() {
  await requireAdmin()
  return getIntegrationConfig()
}

export async function updateWorkerInterval(intervalMs: number) {
  await requireAdmin()
  const config = getIntegrationConfig()
  config.workerIntervalMs = Math.max(1000, intervalMs) // min 1 second
  return { success: true, message: `Worker interval set to ${intervalMs}ms.` }
}

export async function addIntegrationEndpoint(endpoint: { url: string; method: string; params: Record<string, string>; category: string }) {
  await requireAdmin()
  const config = getIntegrationConfig()
  config.endpoints.push({
    id: `ep-${Date.now()}`,
    url: endpoint.url,
    method: endpoint.method,
    params: endpoint.params,
    enabled: true,
    category: endpoint.category || 'students',
  })
  return { success: true }
}

export async function removeIntegrationEndpoint(id: string) {
  await requireAdmin()
  const config = getIntegrationConfig()
  config.endpoints = config.endpoints.filter((e) => e.id !== id)
  return { success: true }
}

export async function toggleIntegrationEndpoint(id: string) {
  await requireAdmin()
  const config = getIntegrationConfig()
  const ep = config.endpoints.find((e) => e.id === id)
  if (ep) ep.enabled = !ep.enabled
  return { success: true }
}

export async function setLastFetch() {
  const config = getIntegrationConfig()
  config.lastFetch = new Date().toISOString()
}

// ─── DB Browser ──────────────────────────────────────────────────────────────

const DB_TABLES = [
  { name: 'users', model: 'user' },
  { name: 'patient_profiles', model: 'patientProfile' },
  { name: 'staff_profiles', model: 'staffProfile' },
  { name: 'hospitals', model: 'hospital' },
  { name: 'clinics', model: 'clinic' },
  { name: 'referrals', model: 'referral' },
  { name: 'referral_events', model: 'referralEvent' },
  { name: 'attachments', model: 'attachment' },
  { name: 'lab_tests', model: 'labTest' },
  { name: 'prescriptions', model: 'prescription' },
  { name: 'notifications', model: 'notification' },
  { name: 'reports', model: 'report' },
  { name: 'support_requests', model: 'supportRequest' },
  { name: 'password_reset_tokens', model: 'passwordResetToken' },
  { name: 'patient_visits', model: 'patientVisit' },
  { name: 'clinic_availability_slots', model: 'clinicAvailabilitySlot' },
] as const

type DbModel = (typeof DB_TABLES)[number]['model']
type DbRow = Record<string, unknown>

function isDbModel(model: string): model is DbModel {
  return DB_TABLES.some((table) => table.model === model)
}

async function countDbRows(model: DbModel) {
  switch (model) {
    case 'user': return prisma.user.count()
    case 'patientProfile': return prisma.patientProfile.count()
    case 'staffProfile': return prisma.staffProfile.count()
    case 'hospital': return prisma.hospital.count()
    case 'clinic': return prisma.clinic.count()
    case 'referral': return prisma.referral.count()
    case 'referralEvent': return prisma.referralEvent.count()
    case 'attachment': return prisma.attachment.count()
    case 'labTest': return prisma.labTest.count()
    case 'prescription': return prisma.prescription.count()
    case 'notification': return prisma.notification.count()
    case 'report': return prisma.report.count()
    case 'supportRequest': return prisma.supportRequest.count()
    case 'passwordResetToken': return prisma.passwordResetToken.count()
    case 'patientVisit': return prisma.patientVisit.count()
    case 'clinicAvailabilitySlot': return prisma.clinicAvailabilitySlot.count()
  }
}

async function findDbRows(model: DbModel, skip: number, take: number) {
  switch (model) {
    case 'user': return prisma.user.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'patientProfile': return prisma.patientProfile.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'staffProfile': return prisma.staffProfile.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'hospital': return prisma.hospital.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'clinic': return prisma.clinic.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'referral': return prisma.referral.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'referralEvent': return prisma.referralEvent.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'attachment': return prisma.attachment.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'labTest': return prisma.labTest.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'prescription': return prisma.prescription.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'notification': return prisma.notification.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'report': return prisma.report.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'supportRequest': return prisma.supportRequest.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'passwordResetToken': return prisma.passwordResetToken.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'patientVisit': return prisma.patientVisit.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'clinicAvailabilitySlot': return prisma.clinicAvailabilitySlot.findMany({ take, skip, orderBy: { id: 'desc' } })
  }
}

function serializeDbRows(rows: unknown[]): DbRow[] {
  return JSON.parse(JSON.stringify(rows, (_, value) => (value instanceof Date ? value.toISOString() : value))) as DbRow[]
}

export async function getDbTables() {
  await requireAdmin()
  await ready()

  const counts = await Promise.all(
    DB_TABLES.map(async (t) => {
      const count = await countDbRows(t.model)
      return { ...t, count }
    }),
  )
  return counts
}

export async function getDbTableData(model: string, page: number = 1, limit: number = 20) {
  await requireAdmin()
  await ready()
  if (!isDbModel(model)) return { data: [], total: 0, page, limit }

  const skip = (page - 1) * limit
  try {
    const [data, total] = await Promise.all([
      findDbRows(model, skip, limit),
      countDbRows(model),
    ])
    return { data: serializeDbRows(data), total, page, limit }
  } catch {
    return { data: [], total: 0, page, limit }
  }
}
