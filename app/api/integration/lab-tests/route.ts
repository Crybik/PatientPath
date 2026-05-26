import { type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAdminApi } from '@/app/lib/api-auth'
import { generateLabTests, readLimit, type MockLabTest, type MockStudent } from '@/app/lib/integration-mock-data'
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

async function ensureStaff(passwordHash: string, role: 'DOCTOR' | 'LAB_STAFF') {
  const username = role === 'DOCTOR' ? 'doctor_integrated' : 'labstaff_integrated'
  const user = await prisma.user.upsert({
    where: { username },
    update: { passwordHash, plainPassword: 'password123', role, isActive: true },
    create: { username, passwordHash, plainPassword: 'password123', role },
    select: { id: true },
  })

  await prisma.staffProfile.upsert({
    where: { userId: user.id },
    update: {
      fullName: role === 'DOCTOR' ? 'Dr. Naif Abdullat' : 'Jameel Lab Specialist',
      title: role === 'DOCTOR' ? 'Clinic Family Doctor' : 'Lab Diagnostics Officer',
      specialization: role === 'DOCTOR' ? 'Family Medicine' : null,
      labSection: role === 'LAB_STAFF' ? 'Pathology' : null,
    },
    create: {
      userId: user.id,
      fullName: role === 'DOCTOR' ? 'Dr. Naif Abdullat' : 'Jameel Lab Specialist',
      title: role === 'DOCTOR' ? 'Clinic Family Doctor' : 'Lab Diagnostics Officer',
      specialization: role === 'DOCTOR' ? 'Family Medicine' : null,
      labSection: role === 'LAB_STAFF' ? 'Pathology' : null,
    },
  })

  return user
}

function labPreview(item: MockLabTest) {
  return {
    id: item.externalId,
    studentId: item.student.uniId,
    patientName: item.student.fullName,
    testType: item.testType,
    status: item.status,
    result: item.result,
    requestDate: item.requestDate,
    resultDate: item.resultDate,
    requestedBy: item.requestedBy,
    labSection: item.labSection,
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi()
  if ('response' in auth) return auth.response

  const limit = readLimit(request.nextUrl.searchParams.get('limit'), 10, 100)
  const status = request.nextUrl.searchParams.get('status') ?? undefined
  const tests = generateLabTests(limit, status).map(labPreview)

  return Response.json({
    success: true,
    mode: 'preview',
    count: tests.length,
    fetchedAt: new Date().toISOString(),
    tests,
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi()
  if ('response' in auth) return auth.response

  const limit = readLimit(request.nextUrl.searchParams.get('limit'), 10, 100)
  const status = request.nextUrl.searchParams.get('status') ?? undefined
  const generated = generateLabTests(limit, status)
  const passwordHash = await bcrypt.hash('password123', 10)

  await ready()

  const doctor = await ensureStaff(passwordHash, 'DOCTOR')
  const labStaff = await ensureStaff(passwordHash, 'LAB_STAFF')
  let created = 0
  let existing = 0
  const tests = []

  for (const item of generated) {
    const patient = await ensurePatient(item.student, passwordHash)
    const requestDate = new Date(item.requestDate)
    const found = await prisma.labTest.findFirst({
      where: {
        patientId: patient.id,
        testType: item.testType,
        requestDate,
      },
      select: { id: true },
    })

    const labTest = found
      ? await prisma.labTest.findUniqueOrThrow({ where: { id: found.id } })
      : await prisma.labTest.create({
          data: {
            patientId: patient.id,
            requestedById: doctor.id,
            labStaffId: item.status === 'COMPLETED' ? labStaff.id : null,
            testType: item.testType,
            status: item.status,
            result: item.result,
            requestDate,
            resultDate: item.resultDate ? new Date(item.resultDate) : null,
          },
        })

    if (found) existing += 1
    else created += 1

    tests.push({
      id: labTest.id,
      studentId: item.student.uniId,
      patientName: item.student.fullName,
      testType: labTest.testType,
      status: labTest.status,
      result: labTest.result,
      requestDate: labTest.requestDate.toISOString(),
      resultDate: labTest.resultDate?.toISOString() ?? null,
      requestedBy: item.requestedBy,
      labSection: item.labSection,
    })
  }

  return Response.json({
    success: true,
    mode: 'sync',
    count: tests.length,
    created,
    existing,
    fetchedAt: new Date().toISOString(),
    tests,
  })
}
