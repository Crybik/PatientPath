export type DashboardRole =
  | 'SUPER_ADMIN'
  | 'PATIENT'
  | 'DOCTOR'
  | 'SPECIALIST'
  | 'LAB_STAFF'
  | 'PHARMACY_STAFF'

export type SerializedPatient = {
  id: number
  username: string
  fullName: string
  uniId: string
  gender: 'MALE' | 'FEMALE'
  dob: string
  phoneNumber: string | null
  faculty: string | null
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
  type: 'CREATED' | 'ACCEPTED' | 'FORWARDED' | 'REJECTED' | 'COMPLETED'
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
  status: 'PENDING' | 'ACCEPTED' | 'FORWARDED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED'
  doctorNote: string
  specialistNote: string | null
  rejectionReason: string | null
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

export type SerializedLabTest = {
  id: number
  testType: string
  status: string
  result: string | null
  requestDate: string
  resultDate: string | null
  patientName: string
  patientUniId: string
  requestedByName: string
  labStaffName: string | null
  referralId: number | null
}

export type SerializedPrescription = {
  id: number
  medicationName: string
  dosage: string
  frequency: string
  duration: string
  isDispensed: boolean
  dispensedDate: string | null
  createdAt: string
  patientName: string
  patientUniId: string
  requestedByName: string
  pharmacyStaffName: string | null
  referralId: number | null
}

export type SerializedNotification = {
  id: number
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

export type PatientLookupResponse = {
  patient: SerializedPatient
  visits: SerializedVisit[]
  referrals: SerializedReferral[]
}
