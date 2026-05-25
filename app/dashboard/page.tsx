import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getAdminStats } from '@/app/actions/admin'
import {
  getDoctorReferrals,
  getLabTestsForStaff,
  getPatientDashboard,
  getPrescriptionsForStaff,
  getSpecialistReferrals,
} from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'
import { AdminOverviewCharts } from '@/app/ui/admin-charts'
import { DashboardOverview } from '@/app/ui/dashboard-overview'

export const metadata = { title: 'Dashboard - PatientPath' }

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  if (session.role === UserRole.SUPER_ADMIN) {
    const stats = await getAdminStats()
    return <AdminOverviewCharts stats={stats} />
  }

  if (session.role === UserRole.DOCTOR) {
    const referrals = await getDoctorReferrals(session.userId)
    return <DashboardOverview role="DOCTOR" stats={{ total: referrals.length, pending: referrals.filter(r => r.status === 'PENDING').length, accepted: referrals.filter(r => r.status === 'ACCEPTED').length, completed: referrals.filter(r => r.status === 'COMPLETED').length }} />
  }

  if (session.role === UserRole.SPECIALIST) {
    const referrals = await getSpecialistReferrals(session.userId)
    return <DashboardOverview role="SPECIALIST" stats={{ total: referrals.length, pending: referrals.filter(r => r.status === 'PENDING').length, accepted: referrals.filter(r => r.status === 'ACCEPTED').length, completed: referrals.filter(r => r.status === 'COMPLETED').length }} />
  }

  if (session.role === UserRole.PATIENT) {
    const data = await getPatientDashboard(session.userId)
    return <DashboardOverview role="PATIENT" stats={{ forwards: data?.referrals.length ?? 0, visits: data?.visits.length ?? 0, latest: data?.referrals[0]?.status ?? 'None' }} patientName={data?.patient.fullName} />
  }

  if (session.role === UserRole.LAB_STAFF) {
    const tests = await getLabTestsForStaff(session.userId)
    return <DashboardOverview role="LAB_STAFF" stats={{ total: tests.length, pending: tests.filter(t => t.status === 'PENDING').length, completed: tests.filter(t => t.status === 'COMPLETED').length }} />
  }

  if (session.role === UserRole.PHARMACY_STAFF) {
    const rxs = await getPrescriptionsForStaff(session.userId)
    return <DashboardOverview role="PHARMACY_STAFF" stats={{ total: rxs.length, pending: rxs.filter(r => !r.isDispensed).length, dispensed: rxs.filter(r => r.isDispensed).length }} />
  }

  return <DashboardOverview role="PATIENT" stats={{}} />
}
