import 'server-only'

import { ReferralStatus, type Prisma } from '@/app/generated/prisma'
import { prisma, ready } from '@/app/lib/prisma'

export type ReportFilters = {
  startDate?: string
  endDate?: string
  clinicId?: number
}

export type AdminReportData = {
  generatedAt: string
  filters: ReportFilters
  totalReferrals: number
  completedReferrals: number
  completionRate: number
  averageProcessingHours: number | null
  statusCounts: { status: string; count: number }[]
  departmentActivity: { clinicId: number; clinicName: string; count: number }[]
}

function referralWhere(filters: ReportFilters): Prisma.ReferralWhereInput {
  const createdAt: Prisma.DateTimeFilter = {}
  if (filters.startDate) createdAt.gte = new Date(`${filters.startDate}T00:00:00.000Z`)
  if (filters.endDate) createdAt.lte = new Date(`${filters.endDate}T23:59:59.999Z`)

  return {
    ...(Object.keys(createdAt).length ? { createdAt } : {}),
    ...(filters.clinicId ? { clinicId: filters.clinicId } : {}),
  }
}

export async function getAdminReport(filters: ReportFilters = {}): Promise<AdminReportData> {
  await ready()
  const where = referralWhere(filters)

  const [totalReferrals, completedReferrals, statusCounts, departmentCounts, completedRows] = await Promise.all([
    prisma.referral.count({ where }),
    prisma.referral.count({ where: { ...where, status: ReferralStatus.COMPLETED } }),
    prisma.referral.groupBy({ by: ['status'], where, _count: true }),
    prisma.referral.groupBy({ by: ['clinicId'], where, _count: true }),
    prisma.referral.findMany({
      where: { ...where, status: ReferralStatus.COMPLETED, completedAt: { not: null } },
      select: { createdAt: true, completedAt: true },
    }),
  ])

  const clinicIds = departmentCounts.map((item) => item.clinicId)
  const clinics = clinicIds.length
    ? await prisma.clinic.findMany({
        where: { id: { in: clinicIds } },
        select: { id: true, name: true },
      })
    : []
  const clinicNameById = new Map(clinics.map((clinic) => [clinic.id, clinic.name]))

  const processingHours = completedRows
    .map((row) => {
      if (!row.completedAt) return null
      return (row.completedAt.getTime() - row.createdAt.getTime()) / 3600000
    })
    .filter((value): value is number => value !== null && value >= 0)

  const averageProcessingHours = processingHours.length
    ? processingHours.reduce((sum, value) => sum + value, 0) / processingHours.length
    : null

  return {
    generatedAt: new Date().toISOString(),
    filters,
    totalReferrals,
    completedReferrals,
    completionRate: totalReferrals ? completedReferrals / totalReferrals : 0,
    averageProcessingHours,
    statusCounts: statusCounts.map((item) => ({ status: item.status, count: item._count })),
    departmentActivity: departmentCounts
      .map((item) => ({
        clinicId: item.clinicId,
        clinicName: clinicNameById.get(item.clinicId) ?? `Clinic #${item.clinicId}`,
        count: item._count,
      }))
      .sort((a, b) => b.count - a.count),
  }
}

export function reportToCsv(report: AdminReportData) {
  const lines = [
    ['Metric', 'Value'],
    ['Generated At', report.generatedAt],
    ['Total Referrals', String(report.totalReferrals)],
    ['Completed Referrals', String(report.completedReferrals)],
    ['Completion Rate', `${Math.round(report.completionRate * 100)}%`],
    ['Average Processing Hours', report.averageProcessingHours === null ? 'N/A' : report.averageProcessingHours.toFixed(1)],
    [],
    ['Status', 'Count'],
    ...report.statusCounts.map((item) => [item.status, String(item.count)]),
    [],
    ['Department', 'Count'],
    ...report.departmentActivity.map((item) => [item.clinicName, String(item.count)]),
  ]

  return lines
    .map((line) => line.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
}
