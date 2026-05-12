import { UserRole } from '@/app/generated/prisma'
import {
  getAllReferrals,
  getDoctorReferrals,
  getPatientDashboard,
  getSpecialistReferrals,
} from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  if (session.role === UserRole.PATIENT) {
    const dashboard = await getPatientDashboard(session.userId)
    return Response.json({
      referrals: dashboard?.referrals ?? [],
      patient: dashboard?.patient ?? null,
    })
  }

  if (session.role === UserRole.DOCTOR) {
    return Response.json({
      referrals: await getDoctorReferrals(session.userId),
    })
  }

  if (session.role === UserRole.SPECIALIST) {
    return Response.json({
      referrals: await getSpecialistReferrals(session.userId),
    })
  }

  if (session.role === UserRole.SUPER_ADMIN) {
    return Response.json({ referrals: await getAllReferrals() })
  }

  return Response.json({ message: 'Forbidden' }, { status: 403 })
}
