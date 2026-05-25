import { UserRole } from '@/app/generated/prisma'
import { getAllLabTests, getLabTestsForStaff } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  if (session.role === UserRole.SUPER_ADMIN) {
    return Response.json({ labTests: await getAllLabTests() })
  }

  if (session.role === UserRole.LAB_STAFF) {
    return Response.json({ labTests: await getLabTestsForStaff(session.userId) })
  }

  return Response.json({ message: 'Forbidden' }, { status: 403 })
}
