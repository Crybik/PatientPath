'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import {
  ReferralEventType,
  ReferralStatus,
  UserRole,
} from '@/app/generated/prisma'
import { createNotification } from '@/app/lib/clinical-data'
import { prisma, ready } from '@/app/lib/prisma'
import { getSession } from '@/app/lib/session'

export type ReferralActionState =
  | {
      success?: boolean
      message?: string
      errors?: Record<string, string[] | undefined>
      version?: number
    }
  | undefined

const NoteSchema = z
  .string()
  .trim()
  .min(8, 'Write at least 8 characters.')
  .max(2000, 'Keep notes under 2000 characters.')

const CreateForwardSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  hospitalId: z.coerce.number().int().positive(),
  clinicId: z.coerce.number().int().positive(),
  slotId: z.coerce.number().int().positive(),
  note: NoteSchema,
})

const AcceptForwardSchema = z.object({
  referralId: z.coerce.number().int().positive(),
  note: NoteSchema,
})

const RejectForwardSchema = z.object({
  referralId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(8, 'Provide a reason (at least 8 characters).').max(2000),
})

const ForwardAgainSchema = z.object({
  referralId: z.coerce.number().int().positive(),
  clinicId: z.coerce.number().int().positive(),
  slotId: z.coerce.number().int().positive(),
  note: NoteSchema,
})

const CompleteSchema = z.object({
  referralId: z.coerce.number().int().positive(),
  note: NoteSchema,
})

function fieldErrors(error: z.ZodError) {
  return z.flattenError(error).fieldErrors
}

async function requireSession(roles: UserRole[]) {
  const session = await getSession()
  if (!session) {
    return { error: 'You must be logged in.' as const }
  }
  if (!roles.includes(session.role)) {
    return { error: 'You do not have permission for this action.' as const }
  }
  return { session }
}

async function canManageReferral(userId: number, role: UserRole, hospitalId: number) {
  if (role === UserRole.SUPER_ADMIN) return true
  if (role !== UserRole.SPECIALIST) return false

  const staff = await prisma.staffProfile.findUnique({
    where: { userId },
    select: { hospitalId: true },
  })
  return staff?.hospitalId === hospitalId
}

export async function createForwardNote(
  _state: ReferralActionState,
  formData: FormData,
): Promise<ReferralActionState> {
  const auth = await requireSession([UserRole.DOCTOR, UserRole.SUPER_ADMIN])
  if ('error' in auth) return { message: auth.error }

  const parsed = CreateForwardSchema.safeParse({
    patientId: formData.get('patientId'),
    hospitalId: formData.get('hospitalId'),
    clinicId: formData.get('clinicId'),
    slotId: formData.get('slotId'),
    note: formData.get('note'),
  })
  if (!parsed.success) {
    return { errors: fieldErrors(parsed.error) }
  }

  await ready()

  const { patientId, hospitalId, clinicId, slotId, note } = parsed.data

  try {
    const result = await prisma.$transaction(async (tx) => {
      const [patient, clinic, slot, specialist] = await Promise.all([
        tx.patientProfile.findUnique({
          where: { id: patientId },
          select: { id: true, userId: true },
        }),
        tx.clinic.findFirst({
          where: { id: clinicId, hospitalId },
          select: { id: true },
        }),
        tx.clinicAvailabilitySlot.findFirst({
          where: { id: slotId, clinicId },
          select: { id: true, startsAt: true, capacity: true, bookedCount: true },
        }),
        tx.staffProfile.findFirst({
          where: { hospitalId, user: { role: UserRole.SPECIALIST } },
          select: { userId: true },
        }),
      ])

      if (!patient) throw new Error('Patient was not found.')
      if (!clinic) throw new Error('Selected clinic does not belong to this hospital.')
      if (!slot) throw new Error('Selected availability slot was not found.')
      if (slot.startsAt < new Date()) throw new Error('Selected time is no longer available.')
      if (slot.bookedCount >= slot.capacity) throw new Error('Selected time is fully booked.')

      await tx.clinicAvailabilitySlot.update({
        where: { id: slot.id },
        data: { bookedCount: { increment: 1 } },
      })

      const referral = await tx.referral.create({
        data: {
          patientId,
          createdById: auth.session.userId,
          currentSpecialistId: specialist?.userId,
          hospitalId,
          clinicId,
          slotId,
          scheduledAt: slot.startsAt,
          doctorNote: note,
          status: ReferralStatus.PENDING,
        },
        select: { id: true },
      })

      await tx.referralEvent.create({
        data: {
          referralId: referral.id,
          actorId: auth.session.userId,
          type: ReferralEventType.CREATED,
          toClinicId: clinicId,
          slotId,
          note,
        },
      })

      // Notify patient
      await tx.notification.create({
        data: {
          userId: patient.userId,
          message: `A new referral has been created for you.`,
          type: 'referral_created',
        },
      })

      // Notify specialist
      if (specialist) {
        await tx.notification.create({
          data: {
            userId: specialist.userId,
            message: `New referral pending your review.`,
            type: 'referral_pending',
          },
        })
      }

      return referral
    })

    revalidatePath('/dashboard')
    return {
      success: true,
      message: `Forward note #${result.id} was sent successfully.`,
      version: Date.now(),
    }
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Could not create the forward note.',
    }
  }
}

export async function acceptForward(
  _state: ReferralActionState,
  formData: FormData,
): Promise<ReferralActionState> {
  const auth = await requireSession([UserRole.SPECIALIST, UserRole.SUPER_ADMIN])
  if ('error' in auth) return { message: auth.error }

  const parsed = AcceptForwardSchema.safeParse({
    referralId: formData.get('referralId'),
    note: formData.get('note'),
  })
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }

  await ready()
  const { referralId, note } = parsed.data

  try {
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      select: { id: true, hospitalId: true, patient: { select: { userId: true } }, createdById: true },
    })
    if (!referral) return { message: 'Forward was not found.' }

    const allowed = await canManageReferral(auth.session.userId, auth.session.role, referral.hospitalId)
    if (!allowed) return { message: 'You cannot manage forwards for this hospital.' }

    await prisma.$transaction([
      prisma.referral.update({
        where: { id: referralId },
        data: {
          status: ReferralStatus.ACCEPTED,
          specialistNote: note,
          acceptedAt: new Date(),
          currentSpecialistId: auth.session.userId,
        },
      }),
      prisma.referralEvent.create({
        data: {
          referralId,
          actorId: auth.session.userId,
          type: ReferralEventType.ACCEPTED,
          note,
        },
      }),
      prisma.notification.create({
        data: {
          userId: referral.patient.userId,
          message: 'Your referral has been accepted by a specialist.',
          type: 'referral_accepted',
        },
      }),
      prisma.notification.create({
        data: {
          userId: referral.createdById,
          message: `Referral #${referralId} has been accepted.`,
          type: 'referral_accepted',
        },
      }),
    ])

    revalidatePath('/dashboard')
    return {
      success: true,
      message: 'Forward was accepted.',
      version: Date.now(),
    }
  } catch {
    return { message: 'Could not accept this forward.' }
  }
}

export async function rejectForward(
  _state: ReferralActionState,
  formData: FormData,
): Promise<ReferralActionState> {
  const auth = await requireSession([UserRole.SPECIALIST, UserRole.SUPER_ADMIN])
  if ('error' in auth) return { message: auth.error }

  const parsed = RejectForwardSchema.safeParse({
    referralId: formData.get('referralId'),
    reason: formData.get('reason'),
  })
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }

  await ready()
  const { referralId, reason } = parsed.data

  try {
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      select: { id: true, hospitalId: true, slotId: true, patient: { select: { userId: true } }, createdById: true },
    })
    if (!referral) return { message: 'Forward was not found.' }

    const allowed = await canManageReferral(auth.session.userId, auth.session.role, referral.hospitalId)
    if (!allowed) return { message: 'You cannot manage forwards for this hospital.' }

    await prisma.$transaction(async (tx) => {
      // Free up the slot
      if (referral.slotId) {
        await tx.clinicAvailabilitySlot.updateMany({
          where: { id: referral.slotId, bookedCount: { gt: 0 } },
          data: { bookedCount: { decrement: 1 } },
        })
      }

      await tx.referral.update({
        where: { id: referralId },
        data: {
          status: ReferralStatus.REJECTED,
          rejectionReason: reason,
          currentSpecialistId: auth.session.userId,
        },
      })

      await tx.referralEvent.create({
        data: {
          referralId,
          actorId: auth.session.userId,
          type: ReferralEventType.REJECTED,
          note: reason,
        },
      })

      await tx.notification.create({
        data: {
          userId: referral.patient.userId,
          message: 'Your referral has been rejected.',
          type: 'referral_rejected',
        },
      })

      await tx.notification.create({
        data: {
          userId: referral.createdById,
          message: `Referral #${referralId} was rejected.`,
          type: 'referral_rejected',
        },
      })
    })

    revalidatePath('/dashboard')
    return { success: true, message: 'Forward was rejected.', version: Date.now() }
  } catch {
    return { message: 'Could not reject this forward.' }
  }
}

export async function completeReferral(
  _state: ReferralActionState,
  formData: FormData,
): Promise<ReferralActionState> {
  const auth = await requireSession([UserRole.SPECIALIST, UserRole.SUPER_ADMIN])
  if ('error' in auth) return { message: auth.error }

  const parsed = CompleteSchema.safeParse({
    referralId: formData.get('referralId'),
    note: formData.get('note'),
  })
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }

  await ready()
  const { referralId, note } = parsed.data

  try {
    const referral = await prisma.referral.findUnique({
      where: { id: referralId },
      select: { id: true, hospitalId: true, patient: { select: { userId: true } }, createdById: true },
    })
    if (!referral) return { message: 'Forward was not found.' }

    const allowed = await canManageReferral(auth.session.userId, auth.session.role, referral.hospitalId)
    if (!allowed) return { message: 'You cannot manage forwards for this hospital.' }

    await prisma.$transaction([
      prisma.referral.update({
        where: { id: referralId },
        data: {
          status: ReferralStatus.COMPLETED,
          specialistNote: note,
          currentSpecialistId: auth.session.userId,
        },
      }),
      prisma.referralEvent.create({
        data: {
          referralId,
          actorId: auth.session.userId,
          type: ReferralEventType.COMPLETED,
          note,
        },
      }),
      prisma.notification.create({
        data: {
          userId: referral.patient.userId,
          message: 'Your referral has been completed.',
          type: 'referral_completed',
        },
      }),
      prisma.notification.create({
        data: {
          userId: referral.createdById,
          message: `Referral #${referralId} has been completed.`,
          type: 'referral_completed',
        },
      }),
    ])

    revalidatePath('/dashboard')
    return { success: true, message: 'Referral marked as completed.', version: Date.now() }
  } catch {
    return { message: 'Could not complete this referral.' }
  }
}

export async function forwardToAnotherClinic(
  _state: ReferralActionState,
  formData: FormData,
): Promise<ReferralActionState> {
  const auth = await requireSession([UserRole.SPECIALIST, UserRole.SUPER_ADMIN])
  if ('error' in auth) return { message: auth.error }

  const parsed = ForwardAgainSchema.safeParse({
    referralId: formData.get('referralId'),
    clinicId: formData.get('clinicId'),
    slotId: formData.get('slotId'),
    note: formData.get('note'),
  })
  if (!parsed.success) return { errors: fieldErrors(parsed.error) }

  await ready()
  const { referralId, clinicId, slotId, note } = parsed.data

  try {
    await prisma.$transaction(async (tx) => {
      const referral = await tx.referral.findUnique({
        where: { id: referralId },
        select: { id: true, hospitalId: true, clinicId: true, slotId: true, patient: { select: { userId: true } } },
      })
      if (!referral) throw new Error('Forward was not found.')

      const allowed = await canManageReferral(auth.session.userId, auth.session.role, referral.hospitalId)
      if (!allowed) throw new Error('You cannot manage forwards for this hospital.')

      const [clinic, slot] = await Promise.all([
        tx.clinic.findFirst({
          where: { id: clinicId, hospitalId: referral.hospitalId },
          select: { id: true },
        }),
        tx.clinicAvailabilitySlot.findFirst({
          where: { id: slotId, clinicId },
          select: { id: true, startsAt: true, capacity: true, bookedCount: true },
        }),
      ])

      if (!clinic) throw new Error('Selected clinic does not belong to this hospital.')
      if (!slot) throw new Error('Selected availability slot was not found.')
      if (slot.startsAt < new Date()) throw new Error('Selected time is no longer available.')
      if (slot.bookedCount >= slot.capacity) throw new Error('Selected time is fully booked.')

      if (referral.slotId && referral.slotId !== slot.id) {
        await tx.clinicAvailabilitySlot.updateMany({
          where: { id: referral.slotId, bookedCount: { gt: 0 } },
          data: { bookedCount: { decrement: 1 } },
        })
      }

      if (referral.slotId !== slot.id) {
        await tx.clinicAvailabilitySlot.update({
          where: { id: slot.id },
          data: { bookedCount: { increment: 1 } },
        })
      }

      await tx.referral.update({
        where: { id: referralId },
        data: {
          status: ReferralStatus.FORWARDED,
          clinicId,
          slotId,
          scheduledAt: slot.startsAt,
          specialistNote: note,
          currentSpecialistId: auth.session.userId,
        },
      })

      await tx.referralEvent.create({
        data: {
          referralId,
          actorId: auth.session.userId,
          type: ReferralEventType.FORWARDED,
          fromClinicId: referral.clinicId,
          toClinicId: clinicId,
          slotId,
          note,
        },
      })

      await tx.notification.create({
        data: {
          userId: referral.patient.userId,
          message: 'Your referral has been forwarded to another clinic.',
          type: 'referral_forwarded',
        },
      })
    })

    revalidatePath('/dashboard')
    return { success: true, message: 'Forward was routed to the selected clinic.', version: Date.now() }
  } catch (error) {
    return { message: error instanceof Error ? error.message : 'Could not route this forward.' }
  }
}
