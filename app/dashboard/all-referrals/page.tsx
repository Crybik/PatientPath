import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getAllReferrals } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'
import { ReferralList } from '@/app/ui/referral-list'

export const metadata = { title: 'All Referrals - PatientPath' }

export default async function AllReferralsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== UserRole.SUPER_ADMIN) redirect('/dashboard')

  const referrals = await getAllReferrals()
  return <ReferralList title="All Referrals" subtitle="System-wide referral activity" referrals={referrals} />
}
