import { type NextRequest } from 'next/server'
import { prisma, ready } from '@/app/lib/prisma'

const CLINICS = [
  { name: 'Internal Medicine Clinic', slug: 'internal-medicine', description: 'General adult medical care and chronic disease management.' },
  { name: 'Cardiology Clinic', slug: 'cardiology', description: 'Comprehensive heart care, ECGs, and vascular diagnostics.' },
  { name: 'Orthopedics Clinic', slug: 'orthopedics', description: 'Bone, joint, and muscle disorder specialist care.' },
  { name: 'Ophthalmology Clinic', slug: 'ophthalmology', description: 'Eye exams, vision testing, and ocular disease care.' },
  { name: 'Pediatrics Clinic', slug: 'pediatrics', description: 'Specialized healthcare for children, infants, and adolescents.' },
  { name: 'Dermatology Clinic', slug: 'dermatology', description: 'Skin, hair, and nail disorder treatment.' },
]

function generateSlots(clinicSlug: string) {
  const slots = []
  const now = new Date()
  
  // Generate slots for the next 3 days
  for (let i = 0; i < 3; i++) {
    const day = new Date(now)
    day.setDate(now.getDate() + i)
    
    // 9:00 AM Slot
    const start1 = new Date(day)
    start1.setHours(9, 0, 0, 0)
    const end1 = new Date(day)
    end1.setHours(10, 0, 0, 0)

    // 11:30 AM Slot
    const start2 = new Date(day)
    start2.setHours(11, 30, 0, 0)
    const end2 = new Date(day)
    end2.setHours(12, 30, 0, 0)

    // 2:00 PM Slot
    const start3 = new Date(day)
    start3.setHours(14, 0, 0, 0)
    const end3 = new Date(day)
    end3.setHours(15, 0, 0, 0)

    slots.push(
      { startsAt: start1.toISOString(), endsAt: end1.toISOString(), capacity: 8, bookedCount: Math.floor(Math.random() * 8) },
      { startsAt: start2.toISOString(), endsAt: end2.toISOString(), capacity: 5, bookedCount: Math.floor(Math.random() * 6) },
      { startsAt: start3.toISOString(), endsAt: end3.toISOString(), capacity: 10, bookedCount: Math.floor(Math.random() * 10) }
    )
  }
  return slots
}

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get('limit')
  const limit = Math.min(Math.max(parseInt(limitParam ?? '10', 10) || 10, 1), 50)
  
  await ready()

  // Ensure default Hospital exists in DB
  let hospital = await prisma.hospital.findFirst()
  if (!hospital) {
    hospital = await prisma.hospital.create({
      data: {
        name: 'Jordan University Hospital',
        shortName: 'JUH',
        city: 'Amman',
      },
    })
  }

  const selectedClinics = CLINICS.slice(0, limit)
  const clinicsData = []

  for (const c of selectedClinics) {
    try {
      // Check if Clinic already exists in DB
      let clinic = await prisma.clinic.findFirst({
        where: { hospitalId: hospital.id, slug: c.slug },
      })

      if (!clinic) {
        clinic = await prisma.clinic.create({
          data: {
            hospitalId: hospital.id,
            name: c.name,
            slug: c.slug,
            description: c.description,
          },
        })
      }

      // Generate and save slots
      const generated = generateSlots(c.slug)
      const syncedSlots = []

      for (const slotData of generated) {
        // Check if slot already exists for this clinic at startsAt
        let slot = await prisma.clinicAvailabilitySlot.findUnique({
          where: {
            clinicId_startsAt: {
              clinicId: clinic.id,
              startsAt: new Date(slotData.startsAt),
            },
          },
        })

        if (!slot) {
          slot = await prisma.clinicAvailabilitySlot.create({
            data: {
              clinicId: clinic.id,
              startsAt: new Date(slotData.startsAt),
              endsAt: new Date(slotData.endsAt),
              capacity: slotData.capacity,
              bookedCount: slotData.bookedCount,
            },
          })
        }
        syncedSlots.push(slot)
      }

      clinicsData.push({
        ...c,
        id: clinic.id,
        hospitalName: hospital.name,
        hospitalShort: hospital.shortName,
        slots: syncedSlots.map((s) => ({
          id: s.id,
          clinicId: s.clinicId,
          startsAt: s.startsAt.toISOString(),
          endsAt: s.endsAt.toISOString(),
          capacity: s.capacity,
          bookedCount: s.bookedCount,
        })),
      })
    } catch (err) {
      // Fallback if db write fails
      clinicsData.push({
        ...c,
        hospitalName: hospital.name,
        hospitalShort: hospital.shortName,
        slots: generateSlots(c.slug),
      })
    }
  }

  return Response.json({
    success: true,
    count: clinicsData.length,
    fetchedAt: new Date().toISOString(),
    clinics: clinicsData,
  })
}
