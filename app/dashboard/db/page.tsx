import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getDbTables } from '@/app/actions/admin'
import { getSession } from '@/app/lib/session'
import { DbBrowser } from '@/app/ui/db-browser'

export const metadata = { title: 'Database - PatientPath' }

export default async function DbPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== UserRole.SUPER_ADMIN) redirect('/dashboard')

  const tables = await getDbTables()
  return <DbBrowser initialTables={tables} />
}
