import { UserRole } from '@/app/generated/prisma'
import { getAllPrescriptions, getPrescriptionsForStaff } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  if (session.role === UserRole.SUPER_ADMIN) {
    return Response.json({ prescriptions: await getAllPrescriptions() })
  }

  if (session.role === UserRole.PHARMACY_STAFF) {
    return Response.json({ prescriptions: await getPrescriptionsForStaff(session.userId) })
  }

  return Response.json({ message: 'Forbidden' }, { status: 403 })
}
