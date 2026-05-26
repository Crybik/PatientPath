import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getAllPrescriptions, getPrescriptionsForRole } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'
import { PharmacyDashboard } from '@/app/ui/pharmacy-dashboard'

export const metadata = { title: 'Prescriptions - PatientPath' }

export default async function PrescriptionsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (
    session.role !== UserRole.PHARMACY_STAFF &&
    session.role !== UserRole.SUPER_ADMIN &&
    session.role !== UserRole.PATIENT &&
    session.role !== UserRole.DOCTOR &&
    session.role !== UserRole.SPECIALIST
  ) {
    redirect('/dashboard')
  }

  const prescriptions = session.role === UserRole.SUPER_ADMIN
    ? await getAllPrescriptions()
    : await getPrescriptionsForRole(session.userId, session.role)

  return <PharmacyDashboard initialPrescriptions={prescriptions} role={session.role} />
}
