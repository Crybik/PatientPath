import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getAllLabTests, getLabTestsForStaff } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'
import { LabDashboard } from '@/app/ui/lab-dashboard'

export const metadata = { title: 'Lab Tests - PatientPath' }

export default async function LabTestsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== UserRole.LAB_STAFF && session.role !== UserRole.SUPER_ADMIN) {
    redirect('/dashboard')
  }

  const tests = session.role === UserRole.SUPER_ADMIN
    ? await getAllLabTests()
    : await getLabTestsForStaff(session.userId)

  return <LabDashboard initialTests={tests} />
}
