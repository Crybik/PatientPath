import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getDoctorReferrals } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'
import { ReferralList } from '@/app/ui/referral-list'

export const metadata = { title: 'My Referrals - PatientPath' }

export default async function ReferralsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== UserRole.DOCTOR && session.role !== UserRole.SUPER_ADMIN) {
    redirect('/dashboard')
  }

  const referrals = await getDoctorReferrals(session.userId)
  return <ReferralList title="My Referrals" subtitle="All referrals you have created" referrals={referrals} />
}
