import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getHospitalsWithClinics, getSpecialistReferrals } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'
import { SpecialistQueue } from '@/app/ui/specialist-queue'

export const metadata = { title: 'Referral Queue - PatientPath' }

export default async function QueuePage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== UserRole.SPECIALIST && session.role !== UserRole.SUPER_ADMIN) {
    redirect('/dashboard')
  }

  const [hospitals, referrals] = await Promise.all([
    getHospitalsWithClinics(),
    getSpecialistReferrals(session.userId),
  ])

  return <SpecialistQueue hospitals={hospitals} initialReferrals={referrals} />
}
