import { redirect } from 'next/navigation'
import type { DashboardRole } from '@/app/lib/dashboard-types'
import { getSession } from '@/app/lib/session'
import { DashboardShell } from '@/app/ui/dashboard-shell'
import { UserRole } from '@/app/generated/prisma'
import { IconChart, IconClipboard, IconFlask, IconForward, IconHome, IconPill, IconUsers } from '@/app/ui/icons'

const navByRole: Record<string, { href: string; label: string; icon?: React.ReactNode }[]> = {
  [UserRole.DOCTOR]: [
    { href: '/dashboard', label: 'Overview', icon: <IconHome className="w-4 h-4" /> },
    { href: '/dashboard/forward', label: 'Forward Note', icon: <IconForward className="w-4 h-4" /> },
    { href: '/dashboard/referrals', label: 'My Referrals', icon: <IconClipboard className="w-4 h-4" /> },
    { href: '/dashboard/lab-tests', label: 'Lab Results', icon: <IconFlask className="w-4 h-4" /> },
    { href: '/dashboard/prescriptions', label: 'Prescriptions', icon: <IconPill className="w-4 h-4" /> },
  ],
  [UserRole.SPECIALIST]: [
    { href: '/dashboard', label: 'Overview', icon: <IconHome className="w-4 h-4" /> },
    { href: '/dashboard/queue', label: 'Referral Queue', icon: <IconClipboard className="w-4 h-4" /> },
    { href: '/dashboard/lab-tests', label: 'Lab Results', icon: <IconFlask className="w-4 h-4" /> },
    { href: '/dashboard/prescriptions', label: 'Prescriptions', icon: <IconPill className="w-4 h-4" /> },
  ],
  [UserRole.PATIENT]: [
    { href: '/dashboard', label: 'Overview', icon: <IconHome className="w-4 h-4" /> },
    { href: '/dashboard/forwards', label: 'My Forwards', icon: <IconForward className="w-4 h-4" /> },
    { href: '/dashboard/visits', label: 'Visit History', icon: <IconClipboard className="w-4 h-4" /> },
    { href: '/dashboard/lab-tests', label: 'Lab Results', icon: <IconFlask className="w-4 h-4" /> },
    { href: '/dashboard/prescriptions', label: 'Prescriptions', icon: <IconPill className="w-4 h-4" /> },
  ],
  [UserRole.LAB_STAFF]: [
    { href: '/dashboard', label: 'Overview', icon: <IconHome className="w-4 h-4" /> },
    { href: '/dashboard/lab-tests', label: 'Pending Lab Requests', icon: <IconFlask className="w-4 h-4" /> },
  ],
  [UserRole.PHARMACY_STAFF]: [
    { href: '/dashboard', label: 'Overview', icon: <IconHome className="w-4 h-4" /> },
    { href: '/dashboard/prescriptions', label: 'Prescriptions', icon: <IconPill className="w-4 h-4" /> },
  ],
  [UserRole.SUPER_ADMIN]: [
    { href: '/dashboard', label: 'Overview', icon: <IconChart className="w-4 h-4" /> },
    { href: '/dashboard/users', label: 'Users', icon: <IconUsers className="w-4 h-4" /> },
    { href: '/dashboard/all-referrals', label: 'All Referrals', icon: <IconClipboard className="w-4 h-4" /> },
    { href: '/dashboard/lab-tests', label: 'Lab Tests', icon: <IconFlask className="w-4 h-4" /> },
    { href: '/dashboard/prescriptions', label: 'Prescriptions', icon: <IconPill className="w-4 h-4" /> },
    { href: '/dashboard/integrations', label: 'Integrations', icon: <IconForward className="w-4 h-4" /> },
    { href: '/dashboard/db', label: 'Database', icon: <IconChart className="w-4 h-4" /> },
  ],
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/login')

  return (
    <DashboardShell
      username={session.username}
      role={session.role as DashboardRole}
      nav={navByRole[session.role] ?? []}
    >
      {children}
    </DashboardShell>
  )
}
