import type { NextRequest } from 'next/server'
import { getAvailability } from '@/app/lib/clinical-data'
import { prisma, ready } from '@/app/lib/prisma'
import { getSession } from '@/app/lib/session'

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ hospitalId: string; clinicId: string }>
  },
) {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const { hospitalId, clinicId } = await context.params
  const parsedHospitalId = Number(hospitalId)
  const parsedClinicId = Number(clinicId)
  if (!Number.isInteger(parsedHospitalId) || !Number.isInteger(parsedClinicId)) {
    return Response.json({ message: 'Invalid hospital or clinic' }, { status: 400 })
  }

  await ready()
  const clinic = await prisma.clinic.findFirst({
    where: { id: parsedClinicId, hospitalId: parsedHospitalId },
    select: { id: true },
  })

  if (!clinic) {
    return Response.json({ message: 'Clinic was not found' }, { status: 404 })
  }

  const slots = await getAvailability(parsedClinicId)
  return Response.json({ slots })
}
