import { type NextRequest } from 'next/server'
import { requireAdminApi } from '@/app/lib/api-auth'
import { generateSlots, MOCK_CLINICS, readLimit } from '@/app/lib/integration-mock-data'
import { prisma, ready } from '@/app/lib/prisma'

const HOSPITAL = {
  name: 'Jordan University Hospital',
  shortName: 'JUH',
  city: 'Amman',
  logoPath: '/PatientPath.png',
}

function clinicPreview(limit: number) {
  return MOCK_CLINICS.slice(0, limit).map((clinic, index) => ({
    ...clinic,
    hospitalName: HOSPITAL.name,
    hospitalShort: HOSPITAL.shortName,
    slots: generateSlots(index),
  }))
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi()
  if ('response' in auth) return auth.response

  const limit = readLimit(request.nextUrl.searchParams.get('limit'), 10, 50)

  return Response.json({
    success: true,
    mode: 'preview',
    count: Math.min(limit, MOCK_CLINICS.length),
    fetchedAt: new Date().toISOString(),
    clinics: clinicPreview(limit),
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi()
  if ('response' in auth) return auth.response

  const limit = readLimit(request.nextUrl.searchParams.get('limit'), 10, 50)
  const selectedClinics = MOCK_CLINICS.slice(0, limit)

  await ready()

  const hospital = await prisma.hospital.upsert({
    where: { shortName: HOSPITAL.shortName },
    update: HOSPITAL,
    create: HOSPITAL,
  })

  let created = 0
  let existing = 0
  let slotsCreated = 0
  let slotsExisting = 0
  const clinics = []

  for (const [index, mockClinic] of selectedClinics.entries()) {
    const found = await prisma.clinic.findUnique({
      where: { hospitalId_slug: { hospitalId: hospital.id, slug: mockClinic.slug } },
      select: { id: true },
    })

    const clinic = await prisma.clinic.upsert({
      where: { hospitalId_slug: { hospitalId: hospital.id, slug: mockClinic.slug } },
      update: { name: mockClinic.name, description: mockClinic.description },
      create: {
        hospitalId: hospital.id,
        name: mockClinic.name,
        slug: mockClinic.slug,
        description: mockClinic.description,
      },
    })

    if (found) existing += 1
    else created += 1

    const slots = []
    for (const slotData of generateSlots(index)) {
      const startsAt = new Date(slotData.startsAt)
      const foundSlot = await prisma.clinicAvailabilitySlot.findUnique({
        where: { clinicId_startsAt: { clinicId: clinic.id, startsAt } },
        select: { id: true },
      })
      const slot = await prisma.clinicAvailabilitySlot.upsert({
        where: { clinicId_startsAt: { clinicId: clinic.id, startsAt } },
        update: {
          endsAt: new Date(slotData.endsAt),
          capacity: slotData.capacity,
          bookedCount: slotData.bookedCount,
        },
        create: {
          clinicId: clinic.id,
          startsAt,
          endsAt: new Date(slotData.endsAt),
          capacity: slotData.capacity,
          bookedCount: slotData.bookedCount,
        },
      })

      if (foundSlot) slotsExisting += 1
      else slotsCreated += 1

      slots.push({
        id: slot.id,
        clinicId: slot.clinicId,
        startsAt: slot.startsAt.toISOString(),
        endsAt: slot.endsAt.toISOString(),
        capacity: slot.capacity,
        bookedCount: slot.bookedCount,
      })
    }

    clinics.push({
      id: clinic.id,
      ...mockClinic,
      hospitalName: hospital.name,
      hospitalShort: hospital.shortName,
      slots,
    })
  }

  return Response.json({
    success: true,
    mode: 'sync',
    count: clinics.length,
    created,
    existing,
    slotsCreated,
    slotsExisting,
    fetchedAt: new Date().toISOString(),
    clinics,
  })
}
