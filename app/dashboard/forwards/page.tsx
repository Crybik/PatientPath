import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getPatientDashboard } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'
import { PatientForwards } from '@/app/ui/patient-forwards'

export const metadata = { title: 'My Forwards - PatientPath' }

export default async function ForwardsPage() {
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
        <p className="mt-2 text-sm text-primary-soft">Your account is not connected to a patient profile yet.</p>
      </div>
    )
  }

  return <PatientForwards patient={data.patient} initialReferrals={data.referrals} />
}
