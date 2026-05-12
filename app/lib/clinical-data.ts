import 'server-only'

import type { Prisma } from '@/app/generated/prisma'
import type {
  PatientLookupResponse,
  SerializedClinic,
  SerializedHospital,
  SerializedPatient,
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

type HospitalWithClinics = Prisma.HospitalGetPayload<{
  include: { clinics: { orderBy: { name: 'asc' } } }
}>

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
  hospital: HospitalWithClinics,
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

  if (!patient) {
    return null
  }

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

  if (!staff?.hospitalId) {
    return []
  }

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
