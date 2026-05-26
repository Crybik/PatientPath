'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { UserRole } from '@/app/generated/prisma'
import { prisma, ready } from '@/app/lib/prisma'
import { getSession } from '@/app/lib/session'

export type PrescriptionActionState =
  | { success?: boolean; message?: string; errors?: Record<string, string[] | undefined> }
  | undefined

const CreatePrescriptionSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  referralId: z.coerce.number().int().positive().optional(),
  medicationName: z.string().trim().min(2).max(120),
  dosage: z.string().trim().min(1).max(80),
  frequency: z.string().trim().min(1).max(80),
  duration: z.string().trim().min(1).max(80),
})

const DispenseSchema = z.object({
  prescriptionId: z.coerce.number().int().positive(),
})

async function canCreateForReferral(referralId: number, patientId: number, userId: number, role: UserRole) {
  if (role === UserRole.SUPER_ADMIN) return true

  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    select: { patientId: true, createdById: true, currentSpecialistId: true, hospitalId: true },
  })
  if (!referral || referral.patientId !== patientId) return false

  if (role === UserRole.DOCTOR) return referral.createdById === userId
  if (role !== UserRole.SPECIALIST) return false

  const staff = await prisma.staffProfile.findUnique({
    where: { userId },
    select: { hospitalId: true },
  })

  return referral.currentSpecialistId === userId || staff?.hospitalId === referral.hospitalId
}

export async function createPrescription(
  _state: PrescriptionActionState,
  formData: FormData,
): Promise<PrescriptionActionState> {
  const session = await getSession()
  if (!session) return { message: 'You must be logged in.' }
  if (session.role !== UserRole.DOCTOR && session.role !== UserRole.SPECIALIST && session.role !== UserRole.SUPER_ADMIN) {
    return { message: 'Only doctors and specialists can create prescriptions.' }
  }

  const parsed = CreatePrescriptionSchema.safeParse({
    patientId: formData.get('patientId'),
    referralId: formData.get('referralId') || undefined,
    medicationName: formData.get('medicationName'),
    dosage: formData.get('dosage'),
    frequency: formData.get('frequency'),
    duration: formData.get('duration'),
  })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  await ready()
  const { patientId, referralId, medicationName, dosage, frequency, duration } = parsed.data

  try {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      select: { id: true, userId: true },
    })
    if (!patient) return { message: 'Patient not found.' }
    if (referralId) {
      const allowed = await canCreateForReferral(referralId, patientId, session.userId, session.role)
      if (!allowed) return { message: 'You cannot create prescriptions for this referral.' }
    }

    await prisma.prescription.create({
      data: {
        patientId,
        referralId: referralId ?? null,
        requestedById: session.userId,
        medicationName,
        dosage,
        frequency,
        duration,
      },
    })

    await prisma.notification.create({
      data: {
        userId: patient.userId,
        message: `A prescription for ${medicationName} has been created.`,
        type: 'prescription_created',
      },
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/prescriptions')
    return { success: true, message: `Prescription for "${medicationName}" created.` }
  } catch {
    return { message: 'Could not create prescription.' }
  }
}

export async function dispensePrescription(
  _state: PrescriptionActionState,
  formData: FormData,
): Promise<PrescriptionActionState> {
  const session = await getSession()
  if (!session) return { message: 'You must be logged in.' }
  if (session.role !== UserRole.PHARMACY_STAFF && session.role !== UserRole.SUPER_ADMIN) {
    return { message: 'Only pharmacy staff can dispense prescriptions.' }
  }

  const parsed = DispenseSchema.safeParse({
    prescriptionId: formData.get('prescriptionId'),
  })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  await ready()
  const { prescriptionId } = parsed.data

  try {
    const rx = await prisma.prescription.findUnique({
      where: { id: prescriptionId },
      select: { id: true, isDispensed: true, patient: { select: { userId: true } }, requestedById: true },
    })
    if (!rx) return { message: 'Prescription not found.' }
    if (rx.isDispensed) return { message: 'Already dispensed.' }

    await prisma.prescription.update({
      where: { id: prescriptionId },
      data: {
        isDispensed: true,
        dispensedDate: new Date(),
        pharmacyStaffId: session.userId,
      },
    })

    await prisma.notification.createMany({
      data: [
        {
          userId: rx.patient.userId,
          message: 'Your prescription has been dispensed.',
          type: 'prescription_dispensed',
        },
        {
          userId: rx.requestedById,
          message: `Prescription #${prescriptionId} has been dispensed.`,
          type: 'prescription_dispensed',
        },
      ],
    })

    revalidatePath('/dashboard')
    revalidatePath('/dashboard/prescriptions')
    return { success: true, message: 'Prescription dispensed.' }
  } catch {
    return { message: 'Could not dispense prescription.' }
  }
}
