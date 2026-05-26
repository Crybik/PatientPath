import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getAllLabTests, getLabTestsForRole } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'
import { LabDashboard } from '@/app/ui/lab-dashboard'

export const metadata = { title: 'Lab Tests - PatientPath' }

export default async function LabTestsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (
    session.role !== UserRole.LAB_STAFF &&
    session.role !== UserRole.SUPER_ADMIN &&
    session.role !== UserRole.PATIENT &&
    session.role !== UserRole.DOCTOR &&
    session.role !== UserRole.SPECIALIST
  ) {
    redirect('/dashboard')
  }

  const tests = session.role === UserRole.SUPER_ADMIN
    ? await getAllLabTests()
    : await getLabTestsForRole(session.userId, session.role)

  return <LabDashboard initialTests={tests} role={session.role} />
}
