import type { NextRequest } from 'next/server'
import { UserRole } from '@/app/generated/prisma'
import { getPatientLookupData } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  if (
    session.role !== UserRole.DOCTOR &&
    session.role !== UserRole.SPECIALIST &&
    session.role !== UserRole.SUPER_ADMIN
  ) {
    return Response.json({ message: 'Forbidden' }, { status: 403 })
  }

  const uniId = request.nextUrl.searchParams.get('uniId')?.trim()
  if (!uniId) {
    return Response.json({ message: 'uniId is required' }, { status: 400 })
  }

  const patient = await getPatientLookupData(uniId)
  if (!patient) {
    return Response.json({ message: 'Patient was not found' }, { status: 404 })
  }

  return Response.json(patient)
}
