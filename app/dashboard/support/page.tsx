import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getSupportRequests } from '@/app/actions/support'
import { getSession } from '@/app/lib/session'
import { SupportAdmin } from '@/app/ui/support-admin'

export const metadata = { title: 'Support Requests - PatientPath' }

export default async function DashboardSupportPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== UserRole.SUPER_ADMIN) redirect('/dashboard')

  const requests = await getSupportRequests()
  return (
    <SupportAdmin
      requests={requests.map((request) => ({
        id: request.id,
        name: request.name,
        email: request.email,
        role: request.role,
        category: request.category,
        subject: request.subject,
        message: request.message,
        status: request.status,
        adminNote: request.adminNote,
        createdAt: request.createdAt.toISOString(),
        user: request.user ? { username: request.user.username, role: request.user.role } : null,
      }))}
    />
  )
}
