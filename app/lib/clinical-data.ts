import 'server-only'

import { UserRole, type Prisma } from '@/app/generated/prisma'
import type {
  PatientLookupResponse,
  SerializedClinic,
  SerializedHospital,
  SerializedLabTest,
  SerializedNotification,
  SerializedPatient,
  SerializedPrescription,
  SerializedReferral,
  SerializedSlot,
  SerializedVisit,
} from '@/app/lib/dashboard-types'
import { prisma, ready } from '@/app/lib/prisma'

export const referralInclude = {
  patient: {
    include: {
      user: { select: { username: true } },
    },
  },
  createdBy: {
    include: {
      staffProfile: true,
    },
  },
  currentSpecialist: {
    include: {
      staffProfile: true,
    },
  },
  hospital: true,
  clinic: true,
  slot: true,
  events: {
    orderBy: { createdAt: 'asc' },
    include: {
      actor: {
        include: {
          patientProfile: true,
          staffProfile: true,
        },
      },
      fromClinic: true,
      toClinic: true,
      slot: true,
    },
  },
} satisfies Prisma.ReferralInclude

type ReferralWithRelations = Prisma.ReferralGetPayload<{
  include: typeof referralInclude
}>

type PatientWithUser = Prisma.PatientProfileGetPayload<{
  include: { user: { select: { username: true } } }
}>

type VisitRecord = Prisma.PatientVisitGetPayload<Record<string, never>>

function iso(value: Date | null | undefined) {
  return value ? value.toISOString() : null
}

export function serializeClinic(clinic: {
  id: number
  hospitalId: number
  name: string
  slug: string
  description: string
}): SerializedClinic {
  return {
    id: clinic.id,
    hospitalId: clinic.hospitalId,
    name: clinic.name,
    slug: clinic.slug,
    description: clinic.description,
  }
}

export function serializeSlot(slot: {
  id: number
  clinicId: number
  startsAt: Date
  endsAt: Date
  capacity: number
  bookedCount: number
}): SerializedSlot {
  return {
    id: slot.id,
    clinicId: slot.clinicId,
    startsAt: slot.startsAt.toISOString(),
    endsAt: slot.endsAt.toISOString(),
    capacity: slot.capacity,
    bookedCount: slot.bookedCount,
    available: Math.max(0, slot.capacity - slot.bookedCount),
  }
}

export function serializePatient(patient: PatientWithUser): SerializedPatient {
  return {
    id: patient.id,
    username: patient.user.username,
    fullName: patient.fullName,
    uniId: patient.uniId,
    gender: patient.gender,
    dob: patient.dob.toISOString(),
    phoneNumber: patient.phoneNumber,
    faculty: patient.faculty,
  }
}

export function serializeVisit(visit: VisitRecord): SerializedVisit {
  return {
    id: visit.id,
    hospitalName: visit.hospitalName,
    clinicName: visit.clinicName,
    doctorName: visit.doctorName,
    visitedAt: visit.visitedAt.toISOString(),
    summary: visit.summary,
    notes: visit.notes,
  }
}

export function serializeHospital(
  hospital: Prisma.HospitalGetPayload<{
    include: { clinics: { orderBy: { name: 'asc' } } }
  }>,
): SerializedHospital {
  return {
    id: hospital.id,
    name: hospital.name,
    shortName: hospital.shortName,
    city: hospital.city,
    logoPath: hospital.logoPath,
    clinics: hospital.clinics.map(serializeClinic),
  }
}

function displayUser(
  user:
    | (Prisma.UserGetPayload<{
        include: {
          staffProfile: true
          patientProfile: true
        }
      }> & { username: string })
    | null,
) {
  return (
    user?.staffProfile?.fullName ??
    user?.patientProfile?.fullName ??
    user?.username ??
    'System'
  )
}

export function serializeReferral(
  referral: ReferralWithRelations,
): SerializedReferral {
  return {
    id: referral.id,
    status: referral.status,
    doctorNote: referral.doctorNote,
    specialistNote: referral.specialistNote,
    rejectionReason: referral.rejectionReason,
    scheduledAt: iso(referral.scheduledAt),
    acceptedAt: iso(referral.acceptedAt),
    createdAt: referral.createdAt.toISOString(),
    updatedAt: referral.updatedAt.toISOString(),
    patient: serializePatient(referral.patient),
    doctorName:
      referral.createdBy.staffProfile?.fullName ?? referral.createdBy.username,
    specialistName: referral.currentSpecialist
      ? (referral.currentSpecialist.staffProfile?.fullName ??
        referral.currentSpecialist.username)
      : null,
    hospital: {
      id: referral.hospital.id,
      name: referral.hospital.name,
      shortName: referral.hospital.shortName,
      city: referral.hospital.city,
      logoPath: referral.hospital.logoPath,
    },
    clinic: serializeClinic(referral.clinic),
    slot: referral.slot ? serializeSlot(referral.slot) : null,
    events: referral.events.map((event) => ({
      id: event.id,
      type: event.type,
      note: event.note,
      actorName: displayUser(event.actor),
      actorRole: event.actor?.role ?? null,
      fromClinicName: event.fromClinic?.name ?? null,
      toClinicName: event.toClinic?.name ?? null,
      slotStartsAt: iso(event.slot?.startsAt),
      slotEndsAt: iso(event.slot?.endsAt),
      createdAt: event.createdAt.toISOString(),
    })),
  }
}

export function serializeLabTest(
  test: Prisma.LabTestGetPayload<{
    include: {
      patient: true
      requestedBy: { include: { staffProfile: true } }
      labStaff: { include: { staffProfile: true } }
    }
  }>,
): SerializedLabTest {
  return {
    id: test.id,
    testType: test.testType,
    status: test.status,
    result: test.result,
    requestDate: test.requestDate.toISOString(),
    resultDate: iso(test.resultDate),
    patientName: test.patient.fullName,
    patientUniId: test.patient.uniId,
    requestedByName:
      test.requestedBy.staffProfile?.fullName ?? test.requestedBy.username,
    labStaffName: test.labStaff?.staffProfile?.fullName ?? test.labStaff?.username ?? null,
    referralId: test.referralId,
  }
}

export function serializePrescription(
  rx: Prisma.PrescriptionGetPayload<{
    include: {
      patient: true
      requestedBy: { include: { staffProfile: true } }
      pharmacyStaff: { include: { staffProfile: true } }
    }
  }>,
): SerializedPrescription {
  return {
    id: rx.id,
    medicationName: rx.medicationName,
    dosage: rx.dosage,
    frequency: rx.frequency,
    duration: rx.duration,
    isDispensed: rx.isDispensed,
    dispensedDate: iso(rx.dispensedDate),
    createdAt: rx.createdAt.toISOString(),
    patientName: rx.patient.fullName,
    patientUniId: rx.patient.uniId,
    requestedByName:
      rx.requestedBy.staffProfile?.fullName ?? rx.requestedBy.username,
    pharmacyStaffName:
      rx.pharmacyStaff?.staffProfile?.fullName ?? rx.pharmacyStaff?.username ?? null,
    referralId: rx.referralId,
  }
}

const labTestInclude = {
  patient: true,
  requestedBy: { include: { staffProfile: true } },
  labStaff: { include: { staffProfile: true } },
} satisfies Prisma.LabTestInclude

const prescriptionInclude = {
  patient: true,
  requestedBy: { include: { staffProfile: true } },
  pharmacyStaff: { include: { staffProfile: true } },
} satisfies Prisma.PrescriptionInclude

// ─── Data Fetchers ───────────────────────────────────────────────────────────

export async function getHospitalsWithClinics() {
  await ready()
  const hospitals = await prisma.hospital.findMany({
    orderBy: { name: 'asc' },
    include: { clinics: { orderBy: { name: 'asc' } } },
  })
  return hospitals.map(serializeHospital)
}

export async function getPatientLookupData(
  uniId: string,
): Promise<PatientLookupResponse | null> {
  await ready()
  const patient = await prisma.patientProfile.findUnique({
    where: { uniId },
    include: { user: { select: { username: true } } },
  })

  if (!patient) return null

  const [visits, referrals] = await Promise.all([
    prisma.patientVisit.findMany({
      where: { patientId: patient.id },
      orderBy: { visitedAt: 'desc' },
    }),
    prisma.referral.findMany({
      where: { patientId: patient.id },
      orderBy: { updatedAt: 'desc' },
      include: referralInclude,
    }),
  ])

  return {
    patient: serializePatient(patient),
    visits: visits.map(serializeVisit),
    referrals: referrals.map(serializeReferral),
  }
}

export async function getAvailability(clinicId: number) {
  await ready()
  const now = new Date()
  const slots = await prisma.clinicAvailabilitySlot.findMany({
    where: {
      clinicId,
      startsAt: { gte: now },
    },
    orderBy: { startsAt: 'asc' },
  })
  return slots.map(serializeSlot)
}

export async function getPatientDashboard(userId: number) {
  await ready()
  const patient = await prisma.patientProfile.findUnique({
    where: { userId },
    include: { user: { select: { username: true } } },
  })

  if (!patient) return null

  const [visits, referrals] = await Promise.all([
    prisma.patientVisit.findMany({
      where: { patientId: patient.id },
      orderBy: { visitedAt: 'desc' },
    }),
    prisma.referral.findMany({
      where: { patientId: patient.id },
      orderBy: { updatedAt: 'desc' },
      include: referralInclude,
    }),
  ])

  return {
    patient: serializePatient(patient),
    visits: visits.map(serializeVisit),
    referrals: referrals.map(serializeReferral),
  }
}

export async function getDoctorReferrals(userId: number) {
  await ready()
  const referrals = await prisma.referral.findMany({
    where: { createdById: userId },
    orderBy: { updatedAt: 'desc' },
    include: referralInclude,
  })
  return referrals.map(serializeReferral)
}

export async function getSpecialistReferrals(userId: number) {
  await ready()
  const staff = await prisma.staffProfile.findUnique({
    where: { userId },
    select: { hospitalId: true },
  })

  if (!staff?.hospitalId) return []

  const referrals = await prisma.referral.findMany({
    where: { hospitalId: staff.hospitalId },
    orderBy: { updatedAt: 'desc' },
    include: referralInclude,
  })
  return referrals.map(serializeReferral)
}

export async function getAllReferrals() {
  await ready()
  const referrals = await prisma.referral.findMany({
    orderBy: { updatedAt: 'desc' },
    include: referralInclude,
  })
  return referrals.map(serializeReferral)
}

// ─── Lab Tests ───────────────────────────────────────────────────────────────

export async function getLabTestsForStaff(userId: number) {
  return getLabTestsForRole(userId, UserRole.LAB_STAFF)
}

export async function getLabTestsForRole(userId: number, role: UserRole) {
  await ready()

  let where: Prisma.LabTestWhereInput = {}
  if (role === UserRole.PATIENT) {
    where = { patient: { userId } }
  } else if (role === UserRole.DOCTOR) {
    where = {
      OR: [
        { requestedById: userId },
        { referral: { is: { createdById: userId } } },
      ],
    }
  } else if (role === UserRole.SPECIALIST) {
    const staff = await prisma.staffProfile.findUnique({
      where: { userId },
      select: { hospitalId: true },
    })
    where = {
      OR: [
        { requestedById: userId },
        { referral: { is: { currentSpecialistId: userId } } },
        ...(staff?.hospitalId ? [{ referral: { is: { hospitalId: staff.hospitalId } } }] : []),
      ],
    }
  } else if (role !== UserRole.LAB_STAFF && role !== UserRole.SUPER_ADMIN) {
    return []
  }

  const tests = await prisma.labTest.findMany({
    where,
    orderBy: { requestDate: 'desc' },
    include: labTestInclude,
  })
  return tests.map(serializeLabTest)
}

export async function getAllLabTests() {
  await ready()
  const tests = await prisma.labTest.findMany({
    orderBy: { requestDate: 'desc' },
    include: labTestInclude,
  })
  return tests.map(serializeLabTest)
}

// ─── Prescriptions ──────────────────────────────────────────────────────────

export async function getPrescriptionsForStaff(userId: number) {
  return getPrescriptionsForRole(userId, UserRole.PHARMACY_STAFF)
}

export async function getPrescriptionsForRole(userId: number, role: UserRole) {
  await ready()

  let where: Prisma.PrescriptionWhereInput = {}
  if (role === UserRole.PATIENT) {
    where = { patient: { userId } }
  } else if (role === UserRole.DOCTOR) {
    where = {
      OR: [
        { requestedById: userId },
        { referral: { is: { createdById: userId } } },
      ],
    }
  } else if (role === UserRole.SPECIALIST) {
    const staff = await prisma.staffProfile.findUnique({
      where: { userId },
      select: { hospitalId: true },
    })
    where = {
      OR: [
        { requestedById: userId },
        { referral: { is: { currentSpecialistId: userId } } },
        ...(staff?.hospitalId ? [{ referral: { is: { hospitalId: staff.hospitalId } } }] : []),
      ],
    }
  } else if (role !== UserRole.PHARMACY_STAFF && role !== UserRole.SUPER_ADMIN) {
    return []
  }

  const prescriptions = await prisma.prescription.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: prescriptionInclude,
  })
  return prescriptions.map(serializePrescription)
}

export async function getAllPrescriptions() {
  await ready()
  const prescriptions = await prisma.prescription.findMany({
    orderBy: { createdAt: 'desc' },
    include: prescriptionInclude,
  })
  return prescriptions.map(serializePrescription)
}

// ─── Notifications ──────────────────────────────────────────────────────────

export async function getNotifications(userId: number): Promise<SerializedNotification[]> {
  await ready()
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return notifications.map((n) => ({
    id: n.id,
    message: n.message,
    type: n.type,
    isRead: n.isRead,
    createdAt: n.createdAt.toISOString(),
  }))
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  await ready()
  return prisma.notification.count({
    where: { userId, isRead: false },
  })
}

export async function createNotification(
  userId: number,
  message: string,
  type: string,
) {
  await ready()
  return prisma.notification.create({
    data: { userId, message, type },
  })
}
