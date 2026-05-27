'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { UserRole } from '@/app/generated/prisma'
import { prisma, ready } from '@/app/lib/prisma'
import { getSession } from '@/app/lib/session'

export type SupportActionState =
  | {
      success?: boolean
      message?: string
      errors?: Record<string, string[] | undefined>
      version?: number
    }
  | undefined

const SupportSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name.').max(160),
  email: z.string().trim().email('Enter a valid email.').max(160),
  role: z.string().trim().max(80).optional().or(z.literal('')),
  category: z.string().trim().min(2).max(80),
  subject: z.string().trim().min(4, 'Enter a subject.').max(180),
  message: z.string().trim().min(10, 'Describe the issue in at least 10 characters.').max(4000),
})

const UpdateSupportSchema = z.object({
  requestId: z.coerce.number().int().positive(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']),
  adminNote: z.string().trim().max(2000).optional().or(z.literal('')),
})

export async function submitSupportRequest(
  _state: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const parsed = SupportSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role') || '',
    category: formData.get('category') || 'Technical Issue',
    subject: formData.get('subject'),
    message: formData.get('message'),
  })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  const session = await getSession()

  try {
    await ready()
    await prisma.supportRequest.create({
      data: {
        userId: session?.userId ?? null,
        ...parsed.data,
        role: parsed.data.role || session?.role || null,
      },
    })
    revalidatePath('/support')
    revalidatePath('/dashboard/support')
    return { success: true, message: 'Support request submitted.', version: Date.now() }
  } catch {
    return { message: 'Could not submit this support request.' }
  }
}

export async function updateSupportRequest(
  _state: SupportActionState,
  formData: FormData,
): Promise<SupportActionState> {
  const session = await getSession()
  if (!session || session.role !== UserRole.SUPER_ADMIN) {
    return { message: 'You do not have permission to update support requests.' }
  }

  const parsed = UpdateSupportSchema.safeParse({
    requestId: formData.get('requestId'),
    status: formData.get('status'),
    adminNote: formData.get('adminNote') || '',
  })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  try {
    await ready()
    await prisma.supportRequest.update({
      where: { id: parsed.data.requestId },
      data: {
        status: parsed.data.status,
        adminNote: parsed.data.adminNote || null,
        resolvedAt: parsed.data.status === 'RESOLVED' ? new Date() : null,
      },
    })
    revalidatePath('/dashboard/support')
    return { success: true, message: 'Support request updated.', version: Date.now() }
  } catch {
    return { message: 'Could not update this support request.' }
  }
}

export async function getSupportRequests() {
  const session = await getSession()
  if (!session || session.role !== UserRole.SUPER_ADMIN) return []
  await ready()
  return prisma.supportRequest.findMany({
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { username: true, role: true } } },
  })
}
