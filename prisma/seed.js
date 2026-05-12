require('dotenv').config()

const bcrypt = require('bcryptjs')
const {
  Gender,
  PrismaClient,
  UserRole,
} = require('../app/generated/prisma')

const prisma = new PrismaClient()

const PASSWORD = '123456789'

function dateOnly(value) {
  return new Date(`${value}T00:00:00.000Z`)
}

function futureSlot(dayOffset, hour, minute = 0) {
  const value = new Date()
  value.setUTCDate(value.getUTCDate() + dayOffset)
  value.setUTCHours(hour, minute, 0, 0)
  return value
}

async function upsertUser(username, role) {
  const passwordHash = await bcrypt.hash(PASSWORD, 10)
  return prisma.user.upsert({
    where: { username },
    update: { passwordHash, role },
    create: { username, passwordHash, role },
  })
}

async function upsertPatientProfile(patient) {
  const user = await upsertUser(patient.username, UserRole.PATIENT)
  return prisma.patientProfile.upsert({
    where: { uniId: patient.uniId },
    update: {
      fullName: patient.fullName,
      gender: patient.gender,
      dob: dateOnly(patient.dob),
      userId: user.id,
    },
    create: {
      userId: user.id,
      fullName: patient.fullName,
      uniId: patient.uniId,
      gender: patient.gender,
      dob: dateOnly(patient.dob),
    },
  })
}

async function main() {
  const existingAdmin = await prisma.user.findUnique({
    where: { username: 'admin' },
    select: { id: true },
  })
  if (existingAdmin) {
    await prisma.user.update({
      where: { id: existingAdmin.id },
      data: { role: UserRole.SUPER_ADMIN },
    })
  } else {
    await upsertUser('admin', UserRole.SUPER_ADMIN)
  }

  const juHospital = await prisma.hospital.upsert({
    where: { shortName: 'JUH' },
    update: {
      name: 'Jordan University Hospital',
      city: 'Amman',
      logoPath: '/jordan-university-hospital-logo.png',
    },
    create: {
      name: 'Jordan University Hospital',
      shortName: 'JUH',
      city: 'Amman',
      logoPath: '/jordan-university-hospital-logo.png',
    },
  })

  const clinics = [
    {
      slug: 'skin',
      name: 'Skin Clinic',
      description: 'Dermatology consults, rashes, acne, and chronic skin care.',
    },
    {
      slug: 'bones',
      name: 'Bones Clinic',
      description: 'Orthopedics, sports injuries, fractures, and joint pain.',
    },
    {
      slug: 'internal-medicine',
      name: 'Internal Medicine Clinic',
      description: 'General adult medicine and complex symptom review.',
    },
    {
      slug: 'cardiology',
      name: 'Cardiology Clinic',
      description: 'Heart rhythm, chest pain, and blood pressure assessment.',
    },
    {
      slug: 'neurology',
      name: 'Neurology Clinic',
      description: 'Headache, dizziness, nerve pain, and seizure review.',
    },
  ]

  const savedClinics = []
  for (const clinic of clinics) {
    savedClinics.push(
      await prisma.clinic.upsert({
        where: {
          hospitalId_slug: {
            hospitalId: juHospital.id,
            slug: clinic.slug,
          },
        },
        update: {
          name: clinic.name,
          description: clinic.description,
        },
        create: {
          hospitalId: juHospital.id,
          slug: clinic.slug,
          name: clinic.name,
          description: clinic.description,
        },
      }),
    )
  }

  await prisma.clinicAvailabilitySlot.deleteMany({
    where: { clinicId: { in: savedClinics.map((clinic) => clinic.id) } },
  })

  for (const [clinicIndex, clinic] of savedClinics.entries()) {
    for (let day = 1; day <= 6; day += 1) {
      const hour = 8 + clinicIndex
      const startsAt = futureSlot(day, hour, day % 2 === 0 ? 30 : 0)
      const endsAt = new Date(startsAt.getTime() + 45 * 60 * 1000)
      await prisma.clinicAvailabilitySlot.create({
        data: {
          clinicId: clinic.id,
          startsAt,
          endsAt,
          capacity: day % 3 === 0 ? 2 : 1,
          bookedCount: 0,
        },
      })
    }
  }

  const doctor = await upsertUser('Fayzed', UserRole.DOCTOR)
  await prisma.staffProfile.upsert({
    where: { userId: doctor.id },
    update: {
      fullName: 'Fayez Abdallat',
      title: 'Referring Doctor',
      hospitalId: null,
    },
    create: {
      userId: doctor.id,
      fullName: 'Fayez Abdallat',
      title: 'Referring Doctor',
    },
  })

  const specialist = await upsertUser('hospital', UserRole.SPECIALIST)
  await prisma.staffProfile.upsert({
    where: { userId: specialist.id },
    update: {
      fullName: 'Jordan University Hospital Specialist',
      title: 'Specialist Intake',
      hospitalId: juHospital.id,
    },
    create: {
      userId: specialist.id,
      fullName: 'Jordan University Hospital Specialist',
      title: 'Specialist Intake',
      hospitalId: juHospital.id,
    },
  })

  const patients = [
    {
      fullName: 'Saleh Ahmad',
      username: 'saleh',
      uniId: '0233949',
      gender: Gender.MALE,
      dob: '2005-03-15',
      visits: [],
    },
    {
      fullName: 'Rasha Zahran',
      username: 'rasha',
      uniId: '0237806',
      gender: Gender.FEMALE,
      dob: '2005-07-29',
      visits: [
        {
          hospitalName: 'Jordan University Hospital',
          clinicName: 'Skin Clinic',
          doctorName: 'Dr. Lina Haddad',
          visitedAt: '2025-09-18',
          summary: 'Dermatitis follow-up',
          notes:
            'Presented with recurrent hand dermatitis. Treated with topical steroid taper and moisturizer plan.',
        },
        {
          hospitalName: 'Prince Hamzah Hospital',
          clinicName: 'Emergency Department',
          doctorName: 'Dr. Omar Nasser',
          visitedAt: '2025-11-03',
          summary: 'Acute abdominal pain',
          notes:
            'Vitals stable. Labs reassuring. Discharged with hydration advice and return precautions.',
        },
        {
          hospitalName: 'King Hussein Medical Center',
          clinicName: 'Internal Medicine',
          doctorName: 'Dr. Abeer Salameh',
          visitedAt: '2026-01-22',
          summary: 'Fatigue evaluation',
          notes:
            'CBC and thyroid screen requested. No urgent findings during exam.',
        },
      ],
    },
    {
      fullName: 'jude Abdlqader',
      username: 'jude',
      uniId: '0232608',
      gender: Gender.FEMALE,
      dob: '2005-03-15',
      visits: [
        {
          hospitalName: 'Specialty Hospital Amman',
          clinicName: 'Orthopedics',
          doctorName: 'Dr. Samer Al-Khatib',
          visitedAt: '2025-08-06',
          summary: 'Left ankle sprain',
          notes:
            'X-ray negative for fracture. Provided brace, rest plan, and physical therapy referral.',
        },
        {
          hospitalName: 'Jordan University Hospital',
          clinicName: 'Neurology Clinic',
          doctorName: 'Dr. Nadia Khoury',
          visitedAt: '2025-12-14',
          summary: 'Migraine review',
          notes:
            'Migraine without aura suspected. Started headache diary and preventive counseling.',
        },
      ],
    },
    {
      fullName: 'Mahmood Dawood',
      username: 'mahmood',
      uniId: '0239420',
      gender: Gender.MALE,
      dob: '2005-03-15',
      visits: [
        {
          hospitalName: 'Islamic Hospital',
          clinicName: 'Bones Clinic',
          doctorName: 'Dr. Khaled Masri',
          visitedAt: '2025-07-11',
          summary: 'Knee pain after football',
          notes:
            'Exam suggested mild ligament strain. Recommended rest, NSAID if tolerated, and reassessment.',
        },
        {
          hospitalName: 'Istishari Hospital',
          clinicName: 'Cardiology Clinic',
          doctorName: 'Dr. Hani Qasem',
          visitedAt: '2025-10-29',
          summary: 'Palpitations',
          notes:
            'ECG normal sinus rhythm. Holter monitor discussed if symptoms recur.',
        },
        {
          hospitalName: 'Al-Bashir Hospital',
          clinicName: 'Emergency Department',
          doctorName: 'Dr. Reem Abu Zaid',
          visitedAt: '2026-02-17',
          summary: 'Seasonal asthma flare',
          notes:
            'Improved after nebulizer treatment. Inhaler technique reviewed before discharge.',
        },
      ],
    },
  ]

  for (const patient of patients) {
    const profile = await upsertPatientProfile(patient)
    await prisma.patientVisit.deleteMany({ where: { patientId: profile.id } })

    if (patient.visits.length > 0) {
      await prisma.patientVisit.createMany({
        data: patient.visits.map((visit) => ({
          patientId: profile.id,
          hospitalName: visit.hospitalName,
          clinicName: visit.clinicName,
          doctorName: visit.doctorName,
          visitedAt: dateOnly(visit.visitedAt),
          summary: visit.summary,
          notes: visit.notes,
        })),
      })
    }
  }

  console.log('Seeded PatientPath demo data.')
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
