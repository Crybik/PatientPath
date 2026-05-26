import 'server-only'

export type MockStudent = {
  uniId: string
  fullName: string
  email: string
  gender: 'MALE' | 'FEMALE'
  dob: string
  phone: string
  faculty: string
}

export type MockClinic = {
  name: string
  slug: string
  description: string
}

export type MockSlot = {
  startsAt: string
  endsAt: string
  capacity: number
  bookedCount: number
}

export type MockAppointment = {
  externalId: string
  student: MockStudent
  clinic: MockClinic
  specialistName: string
  scheduledAt: string
  status: 'ACCEPTED' | 'IN_PROGRESS' | 'COMPLETED' | 'PENDING'
  doctorNote: string
  specialistNote: string | null
}

export type MockLabTest = {
  externalId: string
  student: MockStudent
  testType: string
  status: 'PENDING' | 'COMPLETED'
  result: string | null
  requestDate: string
  resultDate: string | null
  requestedBy: string
  labSection: string
}

export type MockPrescription = {
  externalId: string
  student: MockStudent
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  isDispensed: boolean
  createdAt: string
  dispensedDate: string | null
  prescribedBy: string
}

const FIRST_NAMES = ['Ahmad', 'Sara', 'Omar', 'Lina', 'Khaled', 'Noor', 'Fadi', 'Reem', 'Tariq', 'Hala']
const LAST_NAMES = ['Haddad', 'Nasser', 'Khoury', 'Masri', 'Qasem', 'Salameh', 'Zahran', 'Dawood', 'Abdallat', 'Hamdan']
const FACULTIES = ['Engineering', 'Medicine', 'Science', 'IT', 'Arts', 'Law', 'Business', 'Pharmacy', 'Nursing', 'Dentistry']

export const BASE_STUDENTS: MockStudent[] = [
  { uniId: '0232608', fullName: 'Jood Mohammad', email: 'jood@ju.edu.jo', gender: 'FEMALE', dob: '2003-04-12', phone: '+962791112223', faculty: 'IT' },
  { uniId: '0233949', fullName: 'Saleh Ahmad', email: 'saleh@ju.edu.jo', gender: 'MALE', dob: '2002-11-20', phone: '+962793334445', faculty: 'Engineering' },
  { uniId: '0239420', fullName: 'Mahmood Abdullah', email: 'mahmood@ju.edu.jo', gender: 'MALE', dob: '2004-01-15', phone: '+962795556667', faculty: 'Science' },
  { uniId: '0237806', fullName: 'Rasha Zahran', email: 'rasha@ju.edu.jo', gender: 'FEMALE', dob: '2003-08-05', phone: '+962797778889', faculty: 'Medicine' },
  { uniId: '0220912', fullName: 'Sara Haddad', email: 'sara@ju.edu.jo', gender: 'FEMALE', dob: '2002-05-18', phone: '+962799990000', faculty: 'Pharmacy' },
]

export const MOCK_CLINICS: MockClinic[] = [
  { name: 'Internal Medicine Clinic', slug: 'internal-medicine', description: 'General adult medical care and chronic disease management.' },
  { name: 'Cardiology Clinic', slug: 'cardiology', description: 'Comprehensive heart care, ECGs, and vascular diagnostics.' },
  { name: 'Orthopedics Clinic', slug: 'orthopedics', description: 'Bone, joint, and muscle disorder specialist care.' },
  { name: 'Ophthalmology Clinic', slug: 'ophthalmology', description: 'Eye exams, vision testing, and ocular disease care.' },
  { name: 'Pediatrics Clinic', slug: 'pediatrics', description: 'Specialized healthcare for children, infants, and adolescents.' },
  { name: 'Dermatology Clinic', slug: 'dermatology', description: 'Skin, hair, and nail disorder treatment.' },
]

const TEST_TYPES = [
  { type: 'Complete Blood Count (CBC)', metrics: 'WBC: 6.8x10^9/L, RBC: 4.8x10^12/L, Hemoglobin: 14.2 g/dL, Platelets: 250x10^9/L' },
  { type: 'Kidney Function Test (KFT)', metrics: 'Creatinine: 0.85 mg/dL, Blood Urea Nitrogen: 14 mg/dL, eGFR: 104 mL/min/1.73m2' },
  { type: 'Lipid Profile', metrics: 'Total Cholesterol: 185 mg/dL, Triglycerides: 120 mg/dL, HDL: 52 mg/dL, LDL: 109 mg/dL' },
  { type: 'Fasting Blood Glucose (FBG)', metrics: 'Glucose: 92 mg/dL (Normal: 70-99 mg/dL)' },
  { type: 'Liver Function Test (LFT)', metrics: 'ALT: 22 U/L, AST: 19 U/L, Total Bilirubin: 0.7 mg/dL' },
  { type: 'Thyroid Stimulating Hormone (TSH)', metrics: 'TSH: 2.1 uIU/mL (Normal: 0.4-4.0 uIU/mL)' },
]

const MEDICATIONS = [
  { name: 'Amoxicillin 500mg', dosage: '500mg', frequency: '1 tablet 3 times daily', duration: '7 days' },
  { name: 'Ibuprofen 400mg', dosage: '400mg', frequency: '1 tablet after meals as needed', duration: '5 days' },
  { name: 'Paracetamol 500mg', dosage: '500mg', frequency: '1-2 tablets every 6 hours, max 8 daily', duration: '3 days' },
  { name: 'Metformin 850mg', dosage: '850mg', frequency: '1 tablet twice daily with food', duration: '30 days' },
  { name: 'Atorvastatin 20mg', dosage: '20mg', frequency: '1 tablet at bedtime', duration: '30 days' },
  { name: 'Omeprazole 20mg', dosage: '20mg', frequency: '1 capsule 30 minutes before breakfast', duration: '14 days' },
]

const SPECIALISTS = ['Dr. Naif Abdullat', 'Dr. Amjad Hudaib', 'Dr. Reem Masri', 'Dr. Khaled Haddad', 'Dr. Dina Jarrar']
const STATUSES = ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'PENDING'] as const

export function readLimit(value: string | null, fallback: number, max: number) {
  return Math.min(Math.max(parseInt(value ?? String(fallback), 10) || fallback, 1), max)
}

function stableDate(dayOffset: number, hour: number, minute = 0) {
  const value = new Date()
  value.setHours(hour, minute, 0, 0)
  value.setDate(value.getDate() + dayOffset)
  return value
}

function generatedStudent(index: number): MockStudent {
  if (BASE_STUDENTS[index]) return BASE_STUDENTS[index]

  const firstName = FIRST_NAMES[index % FIRST_NAMES.length]
  const lastName = LAST_NAMES[(index * 3) % LAST_NAMES.length]
  const uniId = `02${String(40000 + index).padStart(5, '0')}`
  return {
    uniId,
    fullName: `${firstName} ${lastName}`,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${index}@ju.edu.jo`,
    gender: index % 2 === 0 ? 'MALE' : 'FEMALE',
    dob: `${2000 + (index % 7)}-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
    phone: `+96279${String(1000000 + index).padStart(7, '0')}`,
    faculty: FACULTIES[index % FACULTIES.length],
  }
}

export function generateStudents(count: number) {
  return Array.from({ length: count }, (_, index) => generatedStudent(index))
}

export function generateSlots(clinicIndex: number): MockSlot[] {
  const slots: MockSlot[] = []

  for (let day = 1; day <= 3; day += 1) {
    const times = [
      { hour: 9, minute: 0, capacity: 8 },
      { hour: 11, minute: 30, capacity: 5 },
      { hour: 14, minute: 0, capacity: 10 },
    ]

    for (const [timeIndex, time] of times.entries()) {
      const startsAt = stableDate(day, time.hour, time.minute)
      const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)
      slots.push({
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        capacity: time.capacity,
        bookedCount: (clinicIndex + day + timeIndex) % time.capacity,
      })
    }
  }

  return slots
}

export function generateAppointments(limit: number): MockAppointment[] {
  return Array.from({ length: limit }, (_, index) => {
    const student = generatedStudent(index % BASE_STUDENTS.length)
    const clinic = MOCK_CLINICS[index % MOCK_CLINICS.length]
    const status = STATUSES[index % STATUSES.length]
    const scheduledAt = stableDate(index + 1, 9 + (index % 5), index % 2 === 0 ? 0 : 30)

    return {
      externalId: `apt-${1000 + index}`,
      student,
      clinic,
      specialistName: SPECIALISTS[index % SPECIALISTS.length],
      scheduledAt: scheduledAt.toISOString(),
      status,
      doctorNote: 'Referred for specialized diagnostic review. Follow-up after 1 week.',
      specialistNote: status === 'COMPLETED' ? 'Patient assessed. Recommended medication and return-to-clinic if symptoms persist.' : null,
    }
  })
}

export function generateLabTests(limit: number, filterStatus?: string): MockLabTest[] {
  const normalizedStatus = filterStatus === 'PENDING' || filterStatus === 'COMPLETED' ? filterStatus : undefined

  return Array.from({ length: limit }, (_, index) => {
    const student = generatedStudent(index % BASE_STUDENTS.length)
    const testInfo = TEST_TYPES[index % TEST_TYPES.length]
    const status = normalizedStatus ?? (index % 3 === 0 ? 'PENDING' : 'COMPLETED')
    const requestDate = stableDate(-index - 1, 8 + (index % 6))
    const resultDate = status === 'COMPLETED' ? new Date(requestDate.getTime() + 6 * 60 * 60 * 1000) : null

    return {
      externalId: `lab-${2000 + index}`,
      student,
      testType: testInfo.type,
      status,
      result: status === 'COMPLETED' ? testInfo.metrics : null,
      requestDate: requestDate.toISOString(),
      resultDate: resultDate?.toISOString() ?? null,
      requestedBy: 'Dr. Naif Abdullat',
      labSection: 'Hematology',
    }
  })
}

export function generatePrescriptions(limit: number): MockPrescription[] {
  return Array.from({ length: limit }, (_, index) => {
    const student = generatedStudent(index % BASE_STUDENTS.length)
    const medication = MEDICATIONS[index % MEDICATIONS.length]
    const isDispensed = index % 3 !== 0
    const createdAt = stableDate(-index - 1, 10 + (index % 5))
    const dispensedDate = isDispensed ? new Date(createdAt.getTime() + 2 * 60 * 60 * 1000) : null

    return {
      externalId: `rx-${3000 + index}`,
      student,
      medicationName: medication.name,
      dosage: medication.dosage,
      frequency: medication.frequency,
      duration: medication.duration,
      isDispensed,
      createdAt: createdAt.toISOString(),
      dispensedDate: dispensedDate?.toISOString() ?? null,
      prescribedBy: 'Dr. Naif Abdullat',
    }
  })
}
