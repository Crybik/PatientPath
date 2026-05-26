import 'server-only'

import { UserRole } from '@/app/generated/prisma'
import { getSession } from '@/app/lib/session'

export async function requireAdminApi() {
  const session = await getSession()
  if (!session) {
    return { response: Response.json({ message: 'Unauthorized' }, { status: 401 }) }
  }
  if (session.role !== UserRole.SUPER_ADMIN) {
    return { response: Response.json({ message: 'Forbidden' }, { status: 403 }) }
  }
  return { session }
}
