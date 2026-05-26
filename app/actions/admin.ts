'use server'

import bcrypt from 'bcryptjs'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@/app/generated/prisma'
import { prisma, ready } from '@/app/lib/prisma'
import { getSession } from '@/app/lib/session'

export type AdminActionState =
  | { success?: boolean; message?: string }
  | undefined

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== UserRole.SUPER_ADMIN) {
    throw new Error('Forbidden')
  }
  return session
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
  { name: 'lab_tests', model: 'labTest' },
  { name: 'prescriptions', model: 'prescription' },
  { name: 'notifications', model: 'notification' },
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
    case 'labTest': return prisma.labTest.count()
    case 'prescription': return prisma.prescription.count()
    case 'notification': return prisma.notification.count()
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
    case 'labTest': return prisma.labTest.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'prescription': return prisma.prescription.findMany({ take, skip, orderBy: { id: 'desc' } })
    case 'notification': return prisma.notification.findMany({ take, skip, orderBy: { id: 'desc' } })
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
