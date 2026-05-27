import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getAllUsers, getHospitalOptions } from '@/app/actions/admin'
import { getSession } from '@/app/lib/session'
import { AdminUsers } from '@/app/ui/admin-users'

export const metadata = { title: 'Users - PatientPath' }

export default async function UsersPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== UserRole.SUPER_ADMIN) redirect('/dashboard')

  const [users, hospitals] = await Promise.all([getAllUsers(), getHospitalOptions()])
  const serialized = users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
    plainPassword: u.plainPassword,
  }))

  return <AdminUsers initialUsers={serialized} hospitals={hospitals} />
}
