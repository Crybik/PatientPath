import { type NextRequest } from 'next/server'
import { prisma, ready } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

const STUDENTS = [
  { uniId: '0232608', fullName: 'Jood Mohammad', email: 'jood@ju.edu.jo', gender: 'FEMALE' as const, dob: '2003-04-12', phone: '+962791112223', faculty: 'IT' },
  { uniId: '0233949', fullName: 'Saleh Ahmad', email: 'saleh@ju.edu.jo', gender: 'MALE' as const, dob: '2002-11-20', phone: '+962793334445', faculty: 'Engineering' },
  { uniId: '0239420', fullName: 'Mahmood Abdullah', email: 'mahmood@ju.edu.jo', gender: 'MALE' as const, dob: '2004-01-15', phone: '+962795556667', faculty: 'Science' },
  { uniId: '0237806', fullName: 'Rasha Zahran', email: 'rasha@ju.edu.jo', gender: 'FEMALE' as const, dob: '2003-08-05', phone: '+962797778889', faculty: 'Medicine' },
  { uniId: '0220912', fullName: 'Sara Haddad', email: 'sara@ju.edu.jo', gender: 'FEMALE' as const, dob: '2002-05-18', phone: '+962799990000', faculty: 'Pharmacy' },
]

const MEDICATIONS = [
  { name: 'Amoxicillin 500mg', dosage: '500mg', frequency: '1 tablet 3 times daily', duration: '7 days' },
  { name: 'Ibuprofen 400mg', dosage: '400mg', frequency: '1 tablet after meals (as needed)', duration: '5 days' },
  { name: 'Paracetamol 500mg', dosage: '500mg', frequency: '1-2 tablets every 6 hours (max 8 daily)', duration: '3 days' },
  { name: 'Metformin 850mg', dosage: '850mg', frequency: '1 tablet twice daily with food', duration: '30 days' },
  { name: 'Atorvastatin 20mg', dosage: '20mg', frequency: '1 tablet at bedtime', duration: '30 days' },
  { name: 'Omeprazole 20mg', dosage: '20mg', frequency: '1 capsule 30 minutes before breakfast', duration: '14 days' },
]

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generatePrescriptions(count: number) {
  const prescriptions = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const student = randomItem(STUDENTS)
    const med = randomItem(MEDICATIONS)
    const isDispensed = Math.random() > 0.4
    
    const requestDate = new Date(now)
    requestDate.setDate(now.getDate() - Math.floor(Math.random() * 10))
    
    let dispensedDate = null
    if (isDispensed) {
      dispensedDate = new Date(requestDate)
      dispensedDate.setHours(requestDate.getHours() + 1 + Math.floor(Math.random() * 6))
    }

    prescriptions.push({
      idStr: `rx-${3000 + i}`,
      student,
      medicationName: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      duration: med.duration,
      isDispensed,
      createdAt: requestDate.toISOString(),
      dispensedDate: dispensedDate ? dispensedDate.toISOString() : null,
      prescribedBy: 'Dr. Naif Abdullat',
    })
  }

  return prescriptions
}

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get('limit') || '10'
  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 100)

  await ready()

  // 1. Ensure Doctor exists
  const passwordHash = await bcrypt.hash('password123', 10)
  let doctor = await prisma.user.findFirst({ where: { role: 'DOCTOR' } })
  if (!doctor) {
    doctor = await prisma.user.create({
      data: {
        username: 'doctor_integrated',
        passwordHash,
        plainPassword: 'password123',
        role: 'DOCTOR',
        staffProfile: {
          create: {
            fullName: 'Dr. Naif Abdullat',
            title: 'Clinic Family Doctor',
            specialization: 'Family Medicine',
          }
        }
      }
    })
  }

  // 2. Ensure Pharmacy Staff exists
  let pharmacyStaff = await prisma.user.findFirst({ where: { role: 'PHARMACY_STAFF' } })
  if (!pharmacyStaff) {
    pharmacyStaff = await prisma.user.create({
      data: {
        username: 'pharmacist_integrated',
        passwordHash,
        plainPassword: 'password123',
        role: 'PHARMACY_STAFF',
        staffProfile: {
          create: {
            fullName: 'Rasha Pharmacist',
            title: 'Head Pharmacist',
          }
        }
      }
    })
  }

  const generated = generatePrescriptions(limit)
  const prescriptionsData = []

  for (const item of generated) {
    try {
      // 3. Ensure Patient profile exists in DB
      let patient = await prisma.patientProfile.findUnique({
        where: { uniId: item.student.uniId },
      })

      if (!patient) {
        const patientUser = await prisma.user.create({
          data: {
            username: item.student.uniId,
            passwordHash,
            plainPassword: 'password123',
            email: item.student.email,
            role: 'PATIENT',
            patientProfile: {
              create: {
                fullName: item.student.fullName,
                uniId: item.student.uniId,
                gender: item.student.gender,
                dob: new Date(item.student.dob),
                phoneNumber: item.student.phone,
                faculty: item.student.faculty,
              }
            }
          },
          include: { patientProfile: true }
        })
        patient = patientUser.patientProfile!
      }

      // 4. Check if Prescription already exists for this patient, medication at this date (checks for new data only)
      let prescription = await prisma.prescription.findFirst({
        where: {
          patientId: patient.id,
          medicationName: item.medicationName,
          createdAt: new Date(item.createdAt),
        }
      })

      if (!prescription) {
        prescription = await prisma.prescription.create({
          data: {
            patientId: patient.id,
            requestedById: doctor.id,
            pharmacyStaffId: item.isDispensed ? pharmacyStaff.id : null,
            medicationName: item.medicationName,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            isDispensed: item.isDispensed,
            dispensedDate: item.dispensedDate ? new Date(item.dispensedDate) : null,
            createdAt: new Date(item.createdAt),
          }
        })
      }

      prescriptionsData.push({
        id: prescription.id,
        studentId: item.student.uniId,
        patientName: item.student.fullName,
        medicationName: prescription.medicationName,
        dosage: prescription.dosage,
        frequency: prescription.frequency,
        duration: prescription.duration,
        isDispensed: prescription.isDispensed,
        createdAt: prescription.createdAt.toISOString(),
        dispensedDate: prescription.dispensedDate?.toISOString() || null,
        prescribedBy: item.prescribedBy,
      })
    } catch {
      prescriptionsData.push({
        id: item.idStr,
        studentId: item.student.uniId,
        patientName: item.student.fullName,
        medicationName: item.medicationName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        isDispensed: item.isDispensed,
        createdAt: item.createdAt,
        dispensedDate: item.dispensedDate,
        prescribedBy: item.prescribedBy,
      })
    }
  }

  return Response.json({
    success: true,
    count: prescriptionsData.length,
    fetchedAt: new Date().toISOString(),
    prescriptions: prescriptionsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  })
}
