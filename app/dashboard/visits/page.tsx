import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getPatientDashboard } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'
import { PatientVisits } from '@/app/ui/patient-visits'

export const metadata = { title: 'Visit History - PatientPath' }

export default async function VisitsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== UserRole.PATIENT && session.role !== UserRole.SUPER_ADMIN) {
    redirect('/dashboard')
  }

  const data = await getPatientDashboard(session.userId)
  if (!data) {
    return (
      <div className="rounded-xl border border-warning/20 bg-warning/5 p-6">
        <h1 className="text-xl font-semibold text-warning">Missing patient profile</h1>
      </div>
    )
  }

  return <PatientVisits patient={data.patient} visits={data.visits} />
}
