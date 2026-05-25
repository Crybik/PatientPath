import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getDoctorReferrals, getHospitalsWithClinics } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'
import { DoctorForwardNote } from '@/app/ui/doctor-forward-note'

export const metadata = { title: 'Forward Note - PatientPath' }

export default async function ForwardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== UserRole.DOCTOR && session.role !== UserRole.SUPER_ADMIN) {
    redirect('/dashboard')
  }

  const [hospitals, referrals] = await Promise.all([
    getHospitalsWithClinics(),
    getDoctorReferrals(session.userId),
  ])

  return <DoctorForwardNote hospitals={hospitals} recentReferrals={referrals} />
}
