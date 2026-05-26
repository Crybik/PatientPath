import { UserRole } from '@/app/generated/prisma'
import { getAllLabTests, getLabTestsForRole } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  if (session.role === UserRole.SUPER_ADMIN) {
    return Response.json({ labTests: await getAllLabTests() })
  }

  if (
    session.role === UserRole.LAB_STAFF ||
    session.role === UserRole.PATIENT ||
    session.role === UserRole.DOCTOR ||
    session.role === UserRole.SPECIALIST
  ) {
    return Response.json({ labTests: await getLabTestsForRole(session.userId, session.role) })
  }

  return Response.json({ message: 'Forbidden' }, { status: 403 })
}
