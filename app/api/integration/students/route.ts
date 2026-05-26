import { type NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { requireAdminApi } from '@/app/lib/api-auth'
import { generateStudents, readLimit, type MockStudent } from '@/app/lib/integration-mock-data'
import { prisma, ready } from '@/app/lib/prisma'

function previewPayload(students: MockStudent[]) {
  return {
    success: true,
    mode: 'preview',
    count: students.length,
    fetchedAt: new Date().toISOString(),
    students,
  }
}

async function syncStudent(student: MockStudent, passwordHash: string) {
  const existing = await prisma.patientProfile.findUnique({
    where: { uniId: student.uniId },
    select: { id: true, userId: true },
  })

  if (existing) {
    await prisma.$transaction([
      prisma.user.update({
        where: { id: existing.userId },
        data: { email: student.email, role: 'PATIENT', isActive: true },
      }),
      prisma.patientProfile.update({
        where: { id: existing.id },
        data: {
          fullName: student.fullName,
          gender: student.gender,
          dob: new Date(student.dob),
          phoneNumber: student.phone,
          faculty: student.faculty,
        },
      }),
    ])
    return { ...student, syncStatus: 'EXISTS' as const }
  }

  const user = await prisma.user.upsert({
    where: { username: student.uniId },
    update: {
      passwordHash,
      plainPassword: 'password123',
      email: student.email,
      role: 'PATIENT',
      isActive: true,
    },
    create: {
      username: student.uniId,
      passwordHash,
      plainPassword: 'password123',
      email: student.email,
      role: 'PATIENT',
    },
    select: { id: true },
  })

  await prisma.patientProfile.create({
    data: {
      userId: user.id,
      fullName: student.fullName,
      uniId: student.uniId,
      gender: student.gender,
      dob: new Date(student.dob),
      phoneNumber: student.phone,
      faculty: student.faculty,
    },
  })

  return { ...student, syncStatus: 'CREATED' as const }
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi()
  if ('response' in auth) return auth.response

  const count = readLimit(request.nextUrl.searchParams.get('count'), 100, 500)
  return Response.json(previewPayload(generateStudents(count)))
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi()
  if ('response' in auth) return auth.response

  const count = readLimit(request.nextUrl.searchParams.get('count'), 100, 500)
  const students = generateStudents(count)
  const passwordHash = await bcrypt.hash('password123', 10)

  await ready()

  const syncedStudents = []
  for (const student of students) {
    syncedStudents.push(await syncStudent(student, passwordHash))
  }

  const created = syncedStudents.filter((student) => student.syncStatus === 'CREATED').length
  const existing = syncedStudents.length - created

  return Response.json({
    success: true,
    mode: 'sync',
    count: syncedStudents.length,
    created,
    existing,
    fetchedAt: new Date().toISOString(),
    students: syncedStudents,
  })
}
