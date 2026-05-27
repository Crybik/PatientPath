'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { ReferralEventType, UserRole } from '@/app/generated/prisma'
import { canMutateReferral } from '@/app/lib/referral-access'
import { prisma, ready } from '@/app/lib/prisma'
import { getSession } from '@/app/lib/session'
import { assertAttachmentFile, storeAttachment } from '@/app/lib/storage'

export type AttachmentActionState =
  | {
      success?: boolean
      message?: string
      errors?: Record<string, string[] | undefined>
      version?: number
    }
  | undefined

const AttachmentSchema = z.object({
  referralId: z.coerce.number().int().positive(),
})

function formFile(value: FormDataEntryValue | null) {
  if (value && typeof value === 'object' && 'arrayBuffer' in value) {
    return value as File
  }
  return null
}

export async function uploadReferralAttachment(
  _state: AttachmentActionState,
  formData: FormData,
): Promise<AttachmentActionState> {
  const session = await getSession()
  if (!session) return { message: 'You must be logged in.' }
  if (
    session.role !== UserRole.DOCTOR &&
    session.role !== UserRole.SPECIALIST &&
    session.role !== UserRole.SUPER_ADMIN
  ) {
    return { message: 'You do not have permission to attach files.' }
  }

  const parsed = AttachmentSchema.safeParse({
    referralId: formData.get('referralId'),
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }

  const file = formFile(formData.get('file'))
  if (!file) return { message: 'Choose a file to attach.' }

  try {
    assertAttachmentFile(file)
    await ready()

    const allowed = await canMutateReferral(session, parsed.data.referralId)
    if (!allowed) return { message: 'You cannot attach files to this referral.' }

    const referral = await prisma.referral.findUnique({
      where: { id: parsed.data.referralId },
      select: {
        id: true,
        createdById: true,
        patient: { select: { userId: true } },
        currentSpecialistId: true,
      },
    })
    if (!referral) return { message: 'Referral was not found.' }

    const bytes = new Uint8Array(await file.arrayBuffer())
    const stored = await storeAttachment({
      referralId: referral.id,
      fileName: file.name,
      mimeType: file.type || 'application/octet-stream',
      bytes,
      uploadedById: session.userId,
    })

    await prisma.$transaction(async (tx) => {
      await tx.attachment.create({
        data: {
          referralId: referral.id,
          uploadedById: session.userId,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          storageProvider: stored.storageProvider,
          status: 'UPLOADED',
          r2Key: stored.r2Key,
          cloudflareImageId: stored.cloudflareImageId,
          cloudflareVariantUrl: stored.cloudflareVariantUrl,
        },
      })

      await tx.referralEvent.create({
        data: {
          referralId: referral.id,
          actorId: session.userId,
          type: ReferralEventType.ATTACHMENT_ADDED,
          note: `${file.name} was attached.`,
        },
      })

      const notifyIds = new Set<number>([referral.patient.userId, referral.createdById])
      if (referral.currentSpecialistId) notifyIds.add(referral.currentSpecialistId)
      notifyIds.delete(session.userId)

      await Promise.all(
        [...notifyIds].map((userId) =>
          tx.notification.create({
            data: {
              userId,
              message: `A new file was attached to referral #${referral.id}.`,
              type: 'referral_attachment',
            },
          }),
        ),
      )
    })

    revalidatePath('/dashboard')
    return {
      success: true,
      message: `${file.name} was attached.`,
      version: Date.now(),
    }
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Could not upload this attachment.',
    }
  }
}
