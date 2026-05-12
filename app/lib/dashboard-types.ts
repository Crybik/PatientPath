export type DashboardRole =
  | 'SUPER_ADMIN'
  | 'PATIENT'
  | 'DOCTOR'
  | 'SPECIALIST'

export type SerializedPatient = {
  id: number
  username: string
  fullName: string
  uniId: string
  gender: 'MALE' | 'FEMALE'
  dob: string
}

export type SerializedVisit = {
  id: number
  hospitalName: string
  clinicName: string
  doctorName: string
  visitedAt: string
  summary: string
  notes: string
}

export type SerializedHospital = {
  id: number
  name: string
  shortName: string
  city: string
  logoPath: string | null
  clinics: SerializedClinic[]
}

export type SerializedClinic = {
  id: number
  hospitalId: number
  name: string
  slug: string
  description: string
}

export type SerializedSlot = {
  id: number
  clinicId: number
  startsAt: string
  endsAt: string
  capacity: number
  bookedCount: number
  available: number
}

export type SerializedReferralEvent = {
  id: number
  type: 'CREATED' | 'ACCEPTED' | 'FORWARDED'
  note: string | null
  actorName: string
  actorRole: DashboardRole | null
  fromClinicName: string | null
  toClinicName: string | null
  slotStartsAt: string | null
  slotEndsAt: string | null
  createdAt: string
}

export type SerializedReferral = {
  id: number
  status: 'PENDING' | 'ACCEPTED' | 'FORWARDED'
  doctorNote: string
  specialistNote: string | null
  scheduledAt: string | null
  acceptedAt: string | null
  createdAt: string
  updatedAt: string
  patient: SerializedPatient
  doctorName: string
  specialistName: string | null
  hospital: {
    id: number
    name: string
    shortName: string
    city: string
    logoPath: string | null
  }
  clinic: SerializedClinic
  slot: SerializedSlot | null
  events: SerializedReferralEvent[]
}

export type PatientLookupResponse = {
  patient: SerializedPatient
  visits: SerializedVisit[]
  referrals: SerializedReferral[]
}
