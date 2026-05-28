import { type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { ReferralStatus } from '@/app/generated/prisma'
import { requireAdminApi } from '@/app/lib/api-auth'
import { generateAppointments, readLimit, type MockAppointment, type MockStudent } from '@/app/lib/integration-mock-data'
import { prisma, ready } from '@/app/lib/prisma'

const HOSPITAL = {
  name: 'Jordan University Hospital',
  shortName: 'JUH',
  city: 'Amman',
  logoPath: '/PatientPath.png',
}

async function ensurePatient(student: MockStudent, passwordHash: string) {
  const existing = await prisma.patientProfile.findUnique({
    where: { uniId: student.uniId },
    select: { id: true, userId: true },
  })

  if (existing) {
    await prisma.patientProfile.update({
      where: { id: existing.id },
      data: {
        fullName: student.fullName,
        gender: student.gender,
        dob: new Date(student.dob),
        phoneNumber: student.phone,
        faculty: student.faculty,
      },
    })
    return existing
  }

  const user = await prisma.user.upsert({
    where: { username: student.uniId },
    update: { passwordHash, plainPassword: 'password123', email: student.email, role: 'PATIENT', isActive: true },
    create: { username: student.uniId, passwordHash, plainPassword: 'password123', email: student.email, role: 'PATIENT' },
    select: { id: true },
  })

  return prisma.patientProfile.create({
    data: {
      userId: user.id,
      fullName: student.fullName,
      uniId: student.uniId,
      gender: student.gender,
      dob: new Date(student.dob),
      phoneNumber: student.phone,
      faculty: student.faculty,
    },
    select: { id: true, userId: true },
  })
}

async function ensureStaff(passwordHash: string, role: 'DOCTOR' | 'SPECIALIST', hospitalId: number) {
  const username = role === 'DOCTOR' ? 'doctor_integrated' : 'specialist_integrated'
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, plainPassword: 'password123', role, isActive: true },
    create: { username, passwordHash, plainPassword: 'password123', role },
    select: { id: true },
  })

  await prisma.staffProfile.upsert({
    where: { userId: user.id },
    update: {
      fullName: role === 'DOCTOR' ? 'Dr. Naif Abdullat' : 'Dr. Amjad Hudaib',
      title: role === 'DOCTOR' ? 'Clinic Family Doctor' : 'Consultant Specialist',
      specialization: role === 'DOCTOR' ? 'Family Medicine' : 'Internal Medicine',
      hospitalId: role === 'SPECIALIST' ? hospitalId : null,
    },
    create: {
      userId: user.id,
      fullName: role === 'DOCTOR' ? 'Dr. Naif Abdullat' : 'Dr. Amjad Hudaib',
      title: role === 'DOCTOR' ? 'Clinic Family Doctor' : 'Consultant Specialist',
      specialization: role === 'DOCTOR' ? 'Family Medicine' : 'Internal Medicine',
      hospitalId: role === 'SPECIALIST' ? hospitalId : null,
    },
  })

  return user
}

function appointmentPreview(item: MockAppointment) {
  return {
    id: item.externalId,
    studentId: item.student.uniId,
    patientName: item.student.fullName,
    clinicName: item.clinic.name,
    specialistName: item.specialistName,
    scheduledAt: item.scheduledAt,
    status: item.status,
    doctorNote: item.doctorNote,
    specialistNote: item.specialistNote,
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi()
  if ('response' in auth) return auth.response

  const limit = readLimit(request.nextUrl.searchParams.get('limit'), 10, 100)
  const appointments = generateAppointments(limit).map(appointmentPreview)

  return Response.json({
    success: true,
    mode: 'preview',
    count: appointments.length,
    fetchedAt: new Date().toISOString(),
    appointments,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi()
  if ('response' in auth) return auth.response

  const limit = readLimit(request.nextUrl.searchParams.get('limit'), 10, 100)
  const generated = generateAppointments(limit)
  const passwordHash = await bcrypt.hash('password123', 10)

  await ready()

  const hospital = await prisma.hospital.upsert({
    where: { shortName: HOSPITAL.shortName },
    update: HOSPITAL,
    create: HOSPITAL,
  })
  const doctor = await ensureStaff(passwordHash, 'DOCTOR', hospital.id)
  const specialist = await ensureStaff(passwordHash, 'SPECIALIST', hospital.id)

  let created = 0
  let existing = 0
  const appointments = []

  for (const item of generated) {
    const patient = await ensurePatient(item.student, passwordHash)
    const clinic = await prisma.clinic.upsert({
      where: { hospitalId_slug: { hospitalId: hospital.id, slug: item.clinic.slug } },
      update: { name: item.clinic.name, description: item.clinic.description },
      create: { hospitalId: hospital.id, name: item.clinic.name, slug: item.clinic.slug, description: item.clinic.description },
    })
    const scheduledAt = new Date(item.scheduledAt)
    const found = await prisma.referral.findFirst({
      where: { patientId: patient.id, clinicId: clinic.id, scheduledAt },
      select: { id: true },
    })

    const referral = found
      ? await prisma.referral.update({
          where: { id: found.id },
          data: {
            currentSpecialistId: specialist.id,
            status: item.status as ReferralStatus,
            doctorNote: item.doctorNote,
            specialistNote: item.specialistNote,
            acceptedAt: item.status !== 'PENDING' ? new Date() : null,
          },
        })
      : await prisma.referral.create({
          data: {
            patientId: patient.id,
            createdById: doctor.id,
            currentSpecialistId: specialist.id,
            hospitalId: hospital.id,
            clinicId: clinic.id,
            status: item.status as ReferralStatus,
            doctorNote: item.doctorNote,
            specialistNote: item.specialistNote,
            scheduledAt,
            acceptedAt: item.status !== 'PENDING' ? new Date() : null,
          },
        })

    if (found) existing += 1
    else created += 1

    appointments.push({
      id: `apt-${referral.id}`,
      studentId: item.student.uniId,
      patientName: item.student.fullName,
      clinicName: clinic.name,
      specialistName: item.specialistName,
      scheduledAt: referral.scheduledAt?.toISOString() ?? item.scheduledAt,
      status: referral.status,
      doctorNote: referral.doctorNote,
      specialistNote: referral.specialistNote,
    })
  }

  return Response.json({
    success: true,
    mode: 'sync',
    count: appointments.length,
    created,
    existing,
    fetchedAt: new Date().toISOString(),
    appointments,
  })
}
