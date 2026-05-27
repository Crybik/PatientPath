'use server'

import { revalidatePath } from 'next/cache'
import { UserRole } from '@/app/generated/prisma'
import { getAdminReport } from '@/app/lib/reports'
import { prisma, ready } from '@/app/lib/prisma'
import { getSession } from '@/app/lib/session'

export type ReportActionState =
  | { success?: boolean; message?: string; version?: number }
  | undefined

async function requireAdmin() {
  const session = await getSession()
  if (!session || session.role !== UserRole.SUPER_ADMIN) {
    throw new Error('Forbidden')
  }
  return session
}

function readFilters(formData: FormData) {
  const clinicValue = formData.get('clinicId')?.toString()
  const clinicId = clinicValue ? Number(clinicValue) : undefined
  return {
    startDate: formData.get('startDate')?.toString() || undefined,
    endDate: formData.get('endDate')?.toString() || undefined,
    clinicId: typeof clinicId === 'number' && Number.isInteger(clinicId) && clinicId > 0 ? clinicId : undefined,
  }
}

export async function createAdminReportSnapshot(
  _state: ReportActionState,
  formData: FormData,
): Promise<ReportActionState> {
  try {
    const session = await requireAdmin()
    await ready()
    const report = await getAdminReport(readFilters(formData))
    await prisma.report.create({
      data: {
        generatedById: session.userId,
        reportType: 'REFERRAL_OPERATIONS',
        data: JSON.stringify(report),
      },
    })
    revalidatePath('/dashboard/reports')
    return { success: true, message: 'Report snapshot saved.', version: Date.now() }
  } catch {
    return { message: 'Could not save this report.' }
  }
}

export async function getRecentReportSnapshots() {
  const session = await getSession()
  if (!session || session.role !== UserRole.SUPER_ADMIN) return []
  await ready()
  return prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { generatedBy: { select: { username: true } } },
  })
}
