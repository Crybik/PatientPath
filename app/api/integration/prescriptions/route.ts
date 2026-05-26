import { type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAdminApi } from '@/app/lib/api-auth'
import { generatePrescriptions, readLimit, type MockPrescription, type MockStudent } from '@/app/lib/integration-mock-data'
import { prisma, ready } from '@/app/lib/prisma'

async function ensurePatient(student: MockStudent, passwordHash: string) {
  const existing = await prisma.patientProfile.findUnique({
    where: { uniId: student.uniId },
    select: { id: true, userId: true },
  })
  if (existing) return existing

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

async function ensureStaff(passwordHash: string, role: 'DOCTOR' | 'PHARMACY_STAFF') {
  const username = role === 'DOCTOR' ? 'doctor_integrated' : 'pharmacist_integrated'
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, plainPassword: 'password123', role, isActive: true },
    create: { username, passwordHash, plainPassword: 'password123', role },
    select: { id: true },
  })

  await prisma.staffProfile.upsert({
    where: { userId: user.id },
    update: {
      fullName: role === 'DOCTOR' ? 'Dr. Naif Abdullat' : 'Rasha Pharmacist',
      title: role === 'DOCTOR' ? 'Clinic Family Doctor' : 'Head Pharmacist',
      specialization: role === 'DOCTOR' ? 'Family Medicine' : null,
      department: role === 'PHARMACY_STAFF' ? 'Pharmacy' : null,
    },
    create: {
      userId: user.id,
      fullName: role === 'DOCTOR' ? 'Dr. Naif Abdullat' : 'Rasha Pharmacist',
      title: role === 'DOCTOR' ? 'Clinic Family Doctor' : 'Head Pharmacist',
      specialization: role === 'DOCTOR' ? 'Family Medicine' : null,
      department: role === 'PHARMACY_STAFF' ? 'Pharmacy' : null,
    },
  })

  return user
}

function prescriptionPreview(item: MockPrescription) {
  return {
    id: item.externalId,
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
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi()
  if ('response' in auth) return auth.response

  const limit = readLimit(request.nextUrl.searchParams.get('limit'), 10, 100)
  const prescriptions = generatePrescriptions(limit).map(prescriptionPreview)

  return Response.json({
    success: true,
    mode: 'preview',
    count: prescriptions.length,
    fetchedAt: new Date().toISOString(),
    prescriptions,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi()
  if ('response' in auth) return auth.response

  const limit = readLimit(request.nextUrl.searchParams.get('limit'), 10, 100)
  const generated = generatePrescriptions(limit)
  const passwordHash = await bcrypt.hash('password123', 10)

  await ready()

  const doctor = await ensureStaff(passwordHash, 'DOCTOR')
  const pharmacyStaff = await ensureStaff(passwordHash, 'PHARMACY_STAFF')
  let created = 0
  let existing = 0
  const prescriptions = []

  for (const item of generated) {
    const patient = await ensurePatient(item.student, passwordHash)
    const createdAt = new Date(item.createdAt)
    const found = await prisma.prescription.findFirst({
      where: {
        patientId: patient.id,
        medicationName: item.medicationName,
        createdAt,
      },
      select: { id: true },
    })

    const prescription = found
      ? await prisma.prescription.findUniqueOrThrow({ where: { id: found.id } })
      : await prisma.prescription.create({
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
            createdAt,
          },
        })

    if (found) existing += 1
    else created += 1

    prescriptions.push({
      id: prescription.id,
      studentId: item.student.uniId,
      patientName: item.student.fullName,
      medicationName: prescription.medicationName,
      dosage: prescription.dosage,
      frequency: prescription.frequency,
      duration: prescription.duration,
      isDispensed: prescription.isDispensed,
      createdAt: prescription.createdAt.toISOString(),
      dispensedDate: prescription.dispensedDate?.toISOString() ?? null,
      prescribedBy: item.prescribedBy,
    })
  }

  return Response.json({
    success: true,
    mode: 'sync',
    count: prescriptions.length,
    created,
    existing,
    fetchedAt: new Date().toISOString(),
    prescriptions,
  })
}
