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

const TEST_TYPES = [
  { type: 'Complete Blood Count (CBC)', metrics: 'WBC: 6.8x10^9/L, RBC: 4.8x10^12/L, Hemoglobin: 14.2 g/dL, Platelets: 250x10^9/L' },
  { type: 'Kidney Function Test (KFT)', metrics: 'Creatinine: 0.85 mg/dL, Blood Urea Nitrogen: 14 mg/dL, eGFR: 104 mL/min/1.73m2' },
  { type: 'Lipid Profile', metrics: 'Total Cholesterol: 185 mg/dL, Triglycerides: 120 mg/dL, HDL: 52 mg/dL, LDL: 109 mg/dL' },
  { type: 'Fasting Blood Glucose (FBG)', metrics: 'Glucose: 92 mg/dL (Normal: 70-99 mg/dL)' },
  { type: 'Liver Function Test (LFT)', metrics: 'ALT: 22 U/L, AST: 19 U/L, Total Bilirubin: 0.7 mg/dL' },
  { type: 'Thyroid Stimulating Hormone (TSH)', metrics: 'TSH: 2.1 uIU/mL (Normal: 0.4-4.0 uIU/mL)' },
]

function randomItem<T>(arr: T[]): T {
  return arr[arr.length - 1 - Math.floor(Math.random() * arr.length)]
}

function generateLabTests(count: number, filterStatus?: string) {
  const tests = []
  const now = new Date()

  for (let i = 0; i < count; i++) {
    const student = randomItem(STUDENTS)
    const testInfo = randomItem(TEST_TYPES)
    const status = filterStatus || (Math.random() > 0.3 ? 'COMPLETED' : 'PENDING')
    
    const requestDate = new Date(now)
    requestDate.setDate(now.getDate() - Math.floor(Math.random() * 10))
    
    let resultDate = null
    let result = null
    
    if (status === 'COMPLETED') {
      resultDate = new Date(requestDate)
      resultDate.setHours(requestDate.getHours() + 4 + Math.floor(Math.random() * 24))
      result = testInfo.metrics
    }

    tests.push({
      idStr: `lab-${2000 + i}`,
      student,
      testType: testInfo.type,
      metrics: testInfo.metrics,
      status,
      result,
      requestDate: requestDate.toISOString(),
      resultDate: resultDate ? resultDate.toISOString() : null,
      requestedBy: 'Dr. Naif Abdullat',
      labSection: 'Hematology',
    })
  }

  return tests
}

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get('limit') || '10'
  const statusParam = request.nextUrl.searchParams.get('status') || undefined
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

  // 2. Ensure Lab Staff exists
  let labStaff = await prisma.user.findFirst({ where: { role: 'LAB_STAFF' } })
  if (!labStaff) {
    labStaff = await prisma.user.create({
      data: {
        username: 'labstaff_integrated',
        passwordHash,
        plainPassword: 'password123',
        role: 'LAB_STAFF',
        staffProfile: {
          create: {
            fullName: 'Jameel Lab Specialist',
            title: 'Lab Diagnostics Officer',
            labSection: 'Pathology',
          }
        }
      }
    })
  }

  const generated = generateLabTests(limit, statusParam)
  const testsData = []

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

      // 4. Check if LabTest already exists for this patient at this date (checks for new data only)
      let labTest = await prisma.labTest.findFirst({
        where: {
          patientId: patient.id,
          testType: item.testType,
          requestDate: new Date(item.requestDate),
        }
      })

      if (!labTest) {
        labTest = await prisma.labTest.create({
          data: {
            patientId: patient.id,
            requestedById: doctor.id,
            labStaffId: item.status === 'COMPLETED' ? labStaff.id : null,
            testType: item.testType,
            status: item.status,
            result: item.result,
            requestDate: new Date(item.requestDate),
            resultDate: item.resultDate ? new Date(item.resultDate) : null,
          }
        })
      }

      testsData.push({
        id: labTest.id,
        studentId: item.student.uniId,
        patientName: item.student.fullName,
        testType: labTest.testType,
        status: labTest.status,
        result: labTest.result,
        requestDate: labTest.requestDate.toISOString(),
        resultDate: labTest.resultDate?.toISOString() || null,
        requestedBy: item.requestedBy,
        labSection: item.labSection,
      })
    } catch {
      testsData.push({
        id: item.idStr,
        studentId: item.student.uniId,
        patientName: item.student.fullName,
        testType: item.testType,
        status: item.status,
        result: item.result,
        requestDate: item.requestDate,
        resultDate: item.resultDate,
        requestedBy: item.requestedBy,
        labSection: item.labSection,
      })
    }
  }

  return Response.json({
    success: true,
    count: testsData.length,
    fetchedAt: new Date().toISOString(),
    tests: testsData.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime()),
  })
}
