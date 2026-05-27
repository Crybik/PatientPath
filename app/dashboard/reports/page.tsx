import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getRecentReportSnapshots } from '@/app/actions/reports'
import { getHospitalsWithClinics } from '@/app/lib/clinical-data'
import { getAdminReport } from '@/app/lib/reports'
import { getSession } from '@/app/lib/session'
import { AdminReports } from '@/app/ui/admin-reports'

export const metadata = { title: 'Reports - PatientPath' }

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string; clinicId?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== UserRole.SUPER_ADMIN) redirect('/dashboard')

  const params = await searchParams
  const clinicId = params.clinicId ? Number(params.clinicId) : undefined
  const [report, hospitals, snapshots] = await Promise.all([
    getAdminReport({
      startDate: params.startDate || undefined,
      endDate: params.endDate || undefined,
      clinicId: typeof clinicId === 'number' && Number.isInteger(clinicId) && clinicId > 0 ? clinicId : undefined,
    }),
    getHospitalsWithClinics(),
    getRecentReportSnapshots(),
  ])

  return (
    <AdminReports
      report={report}
      clinics={hospitals.flatMap((hospital) => hospital.clinics)}
      snapshots={snapshots.map((snapshot) => ({
        id: snapshot.id,
        reportType: snapshot.reportType,
        createdAt: snapshot.createdAt.toISOString(),
        generatedBy: snapshot.generatedBy.username,
      }))}
    />
  )
}
