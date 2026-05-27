import type { NextRequest } from 'next/server'
import { UserRole } from '@/app/generated/prisma'
import { getAdminReport, reportToCsv } from '@/app/lib/reports'
import { getSession } from '@/app/lib/session'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })
  if (session.role !== UserRole.SUPER_ADMIN) return Response.json({ message: 'Forbidden' }, { status: 403 })

  const clinicValue = request.nextUrl.searchParams.get('clinicId')
  const clinicId = clinicValue ? Number(clinicValue) : undefined
  const report = await getAdminReport({
    startDate: request.nextUrl.searchParams.get('startDate') || undefined,
    endDate: request.nextUrl.searchParams.get('endDate') || undefined,
    clinicId: typeof clinicId === 'number' && Number.isInteger(clinicId) && clinicId > 0 ? clinicId : undefined,
  })

  return new Response(reportToCsv(report), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="patientpath-report-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
