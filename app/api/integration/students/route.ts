import { type NextRequest } from 'next/server'
import { prisma, ready } from '@/app/lib/prisma'
import bcrypt from 'bcryptjs'

const FIRST_NAMES = ['Ahmad', 'Sara', 'Omar', 'Lina', 'Khaled', 'Noor', 'Fadi', 'Reem', 'Tariq', 'Hala', 'Yousef', 'Dana', 'Mazen', 'Aya', 'Sami', 'Layla', 'Rami', 'Dina', 'Zaid', 'Mona']
const LAST_NAMES = ['Haddad', 'Nasser', 'Khoury', 'Masri', 'Qasem', 'Salameh', 'Zahran', 'Dawood', 'Abdallat', 'Abu Zaid', 'Al-Khatib', 'Hamdan', 'Jarrar', 'Obeidat', 'Tawfiq']
const FACULTIES = ['Engineering', 'Medicine', 'Science', 'IT', 'Arts', 'Law', 'Business', 'Pharmacy', 'Nursing', 'Dentistry']
const GENDERS = ['MALE', 'FEMALE'] as const

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomItem<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateUniId() {
  return `02${randomInt(30000, 99999)}`
}

function generateDob() {
  const year = randomInt(2000, 2006)
  const month = String(randomInt(1, 12)).padStart(2, '0')
  const day = String(randomInt(1, 28)).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function generatePhone() {
  return `+9627${randomInt(90000000, 99999999)}`
}

function generateStudent() {
  const gender = randomItem(GENDERS)
  const firstName = randomItem(FIRST_NAMES)
  const lastName = randomItem(LAST_NAMES)
  return {
    uniId: generateUniId(),
    fullName: `${firstName} ${lastName}`,
    gender,
    dob: generateDob(),
    phoneNumber: generatePhone(),
    faculty: randomItem(FACULTIES),
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(' ', '')}@ju.edu.jo`,
  }
}

export async function GET(request: NextRequest) {
  const countParam = request.nextUrl.searchParams.get('count')
  const count = Math.min(Math.max(parseInt(countParam ?? '100', 10) || 100, 1), 500)

  const students = Array.from({ length: count }, generateStudent)

  // Ensure unique IDs
  const seen = new Set<string>()
  const unique = students.filter((s) => {
    if (seen.has(s.uniId)) return false
    seen.add(s.uniId)
    return true
  })

  await ready()

  // Save new students to the database
  const passwordHash = await bcrypt.hash('password123', 10)
  const syncedStudents = []

  for (const s of unique) {
    try {
      // Check if patient already exists (checks for new data only)
      let patientProfile = await prisma.patientProfile.findUnique({
        where: { uniId: s.uniId },
      })

      if (!patientProfile) {
        // Create user and profile
        const user = await prisma.user.create({
          data: {
            username: s.uniId,
            passwordHash,
            plainPassword: 'password123',
            email: s.email,
            role: 'PATIENT',
            patientProfile: {
              create: {
                fullName: s.fullName,
                uniId: s.uniId,
                gender: s.gender,
                dob: new Date(s.dob),
                phoneNumber: s.phoneNumber,
                faculty: s.faculty,
              },
            },
          },
          include: {
            patientProfile: true,
          },
        })
        patientProfile = user.patientProfile
        syncedStudents.push({ ...s, syncStatus: 'CREATED' })
      } else {
        syncedStudents.push({ ...s, syncStatus: 'EXISTS' })
      }
    } catch {
      syncedStudents.push({ ...s, syncStatus: 'ERROR' })
    }
  }

  return Response.json({
    success: true,
    count: syncedStudents.length,
    fetchedAt: new Date().toISOString(),
    students: syncedStudents,
  })
}
