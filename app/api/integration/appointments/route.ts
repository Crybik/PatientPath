import { type NextRequest } from 'next/server'
import { prisma, ready } from '@/app/lib/prisma'
import { ReferralStatus } from '@/app/generated/prisma'
import bcrypt from 'bcryptjs'

const STUDENTS = [
  { uniId: '0232608', fullName: 'Jood Mohammad', email: 'jood@ju.edu.jo', gender: 'FEMALE' as const, dob: '2003-04-12', phone: '+962791112223', faculty: 'IT' },
  { uniId: '0233949', fullName: 'Saleh Ahmad', email: 'saleh@ju.edu.jo', gender: 'MALE' as const, dob: '2002-11-20', phone: '+962793334445', faculty: 'Engineering' },
  { uniId: '0239420', fullName: 'Mahmood Abdullah', email: 'mahmood@ju.edu.jo', gender: 'MALE' as const, dob: '2004-01-15', phone: '+962795556667', faculty: 'Science' },
  { uniId: '0237806', fullName: 'Rasha Zahran', email: 'rasha@ju.edu.jo', gender: 'FEMALE' as const, dob: '2003-08-05', phone: '+962797778889', faculty: 'Medicine' },
  { uniId: '0220912', fullName: 'Sara Haddad', email: 'sara@ju.edu.jo', gender: 'FEMALE' as const, dob: '2002-05-18', phone: '+962799990000', faculty: 'Pharmacy' },
]

const CLINICS = [
  { name: 'Internal Medicine Clinic', slug: 'internal-medicine', description: 'General adult medical care and chronic disease management.' },
  { name: 'Cardiology Clinic', slug: 'cardiology', description: 'Comprehensive heart care, ECGs, and vascular diagnostics.' },
  { name: 'Orthopedics Clinic', slug: 'orthopedics', description: 'Bone, joint, and muscle disorder specialist care.' },
  { name: 'Ophthalmology Clinic', slug: 'ophthalmology', description: 'Eye exams, vision testing, and ocular disease care.' },
  { name: 'Pediatrics Clinic', slug: 'pediatrics', description: 'Specialized healthcare for children, infants, and adolescents.' },
]
const SPECIALISTS = ['Dr. Naif Abdullat', 'Dr. Amjad Hudaib', 'Dr. Reem Masri', 'Dr. Khaled Haddad', 'Dr. Dina Jarrar']
const STATUSES = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'PENDING']

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateAppointments(count: number) {
  const appointments = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const student = randomItem(STUDENTS)
    const clinic = randomItem(CLINICS)
    const specialist = randomItem(SPECIALISTS)
    const status = randomItem(STATUSES)
    
    const dateOffset = Math.floor(Math.random() * 10) - 5
    const appointmentDate = new Date(now)
    appointmentDate.setDate(now.getDate() + dateOffset)
    appointmentDate.setHours(9 + Math.floor(Math.random() * 5), 0, 0, 0)

    appointments.push({
      idStr: `apt-${1000 + i}`,
      student,
      clinic,
      specialistName: specialist,
      scheduledAt: appointmentDate.toISOString(),
      status,
      doctorNote: `Referred for specialized diagnostic review. Follow-up after 1 week.`,
      specialistNote: status === 'COMPLETED' ? `Patient assessed. Recommended medication and return-to-clinic if symptoms persist.` : null,
    })
  }
  return appointments
}

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get('limit') || '10'
  const limit = Math.min(Math.max(parseInt(limitParam, 10) || 10, 1), 100)

  await ready()

  // 1. Ensure Hospital exists
  let hospital = await prisma.hospital.findFirst()
  if (!hospital) {
    hospital = await prisma.hospital.create({
      data: { name: 'Jordan University Hospital', shortName: 'JUH', city: 'Amman' }
    })
  }

  // 2. Ensure default DOCTOR and SPECIALIST users exist in DB
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
            hospitalId: hospital.id
          }
        }
      }
    })
  }

  let specialist = await prisma.user.findFirst({ where: { role: 'SPECIALIST' } })
  if (!specialist) {
    specialist = await prisma.user.create({
      data: {
        username: 'specialist_integrated',
        passwordHash,
        plainPassword: 'password123',
        role: 'SPECIALIST',
        staffProfile: {
          create: {
            fullName: 'Dr. Amjad Hudaib',
            title: 'Consultant Specialist',
            specialization: 'Internal Medicine',
            hospitalId: hospital.id
          }
        }
      }
    })
  }

  const generated = generateAppointments(limit)
  const appointmentsData = []

  for (const item of generated) {
    try {
      // 3. Ensure Patient profile exists in DB (sync on the fly!)
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

      // 4. Ensure Clinic exists in DB
      let clinic = await prisma.clinic.findFirst({
        where: { hospitalId: hospital.id, slug: item.clinic.slug }
      })

      if (!clinic) {
        clinic = await prisma.clinic.create({
          data: {
            hospitalId: hospital.id,
            name: item.clinic.name,
            slug: item.clinic.slug,
            description: item.clinic.description
          }
        })
      }

      // 5. Check if Referral (Appointment) already exists for this patient in this clinic at startsAt (checks for new data only)
      let referral = await prisma.referral.findFirst({
        where: {
          patientId: patient.id,
          clinicId: clinic.id,
          scheduledAt: new Date(item.scheduledAt),
        }
      })

      if (!referral) {
        referral = await prisma.referral.create({
          data: {
            patientId: patient.id,
            createdById: doctor.id,
            currentSpecialistId: specialist.id,
            hospitalId: hospital.id,
            clinicId: clinic.id,
            status: item.status as ReferralStatus,
            doctorNote: item.doctorNote,
            specialistNote: item.specialistNote,
            scheduledAt: new Date(item.scheduledAt),
            acceptedAt: item.status !== 'PENDING' ? new Date() : null,
          }
        })
      }

      appointmentsData.push({
        id: `apt-${referral.id}`,
        studentId: item.student.uniId,
        patientName: item.student.fullName,
        clinicName: clinic.name,
        specialistName: item.specialistName,
        scheduledAt: referral.scheduledAt?.toISOString() || item.scheduledAt,
        status: referral.status,
        doctorNote: referral.doctorNote,
        specialistNote: referral.specialistNote,
      })
    } catch {
      appointmentsData.push({
        id: item.idStr,
        studentId: item.student.uniId,
        patientName: item.student.fullName,
        clinicName: item.clinic.name,
        specialistName: item.specialistName,
        scheduledAt: item.scheduledAt,
        status: item.status,
        doctorNote: item.doctorNote,
        specialistNote: item.specialistNote,
      })
    }
  }

  return Response.json({
    success: true,
    count: appointmentsData.length,
    fetchedAt: new Date().toISOString(),
    appointments: appointmentsData.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()),
  })
}
