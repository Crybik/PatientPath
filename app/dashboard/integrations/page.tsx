import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import { getIntegrationSettings } from '@/app/actions/admin'
import { getSession } from '@/app/lib/session'
import { IntegrationPage } from '@/app/ui/integration-page'

export const metadata = { title: 'Integrations - PatientPath' }

export default async function IntegrationsRoute() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== UserRole.SUPER_ADMIN) redirect('/dashboard')

  const settings = await getIntegrationSettings()
  return <IntegrationPage initialSettings={settings} />
}
