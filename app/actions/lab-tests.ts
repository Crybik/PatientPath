'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { UserRole } from '@/app/generated/prisma'
import { prisma, ready } from '@/app/lib/prisma'
import { getSession } from '@/app/lib/session'

export type LabTestActionState =
  | { success?: boolean; message?: string; errors?: Record<string, string[] | undefined> }
  | undefined

const RequestLabTestSchema = z.object({
  patientId: z.coerce.number().int().positive(),
  referralId: z.coerce.number().int().positive().optional(),
  testType: z.string().trim().min(2, 'Test type is required.').max(120),
})

const ProcessLabTestSchema = z.object({
  labTestId: z.coerce.number().int().positive(),
  result: z.string().trim().min(2, 'Result is required.').max(5000),
})

export async function requestLabTest(
  _state: LabTestActionState,
  formData: FormData,
): Promise<LabTestActionState> {
  const session = await getSession()
  if (!session) return { message: 'You must be logged in.' }
  if (session.role !== UserRole.DOCTOR && session.role !== UserRole.SPECIALIST && session.role !== UserRole.SUPER_ADMIN) {
    return { message: 'Only doctors and specialists can request lab tests.' }
  }

  const parsed = RequestLabTestSchema.safeParse({
    patientId: formData.get('patientId'),
    referralId: formData.get('referralId') || undefined,
    testType: formData.get('testType'),
  })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  await ready()
  const { patientId, referralId, testType } = parsed.data

  try {
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patientId },
      select: { id: true, userId: true },
    })
    if (!patient) return { message: 'Patient not found.' }

    await prisma.labTest.create({
      data: {
        patientId,
        referralId: referralId ?? null,
        requestedById: session.userId,
        testType,
        status: 'PENDING',
      },
    })

    await prisma.notification.create({
      data: {
        userId: patient.userId,
        message: `A ${testType} lab test has been requested for you.`,
        type: 'lab_test_requested',
      },
    })

    revalidatePath('/dashboard')
    return { success: true, message: `Lab test "${testType}" requested.` }
  } catch {
    return { message: 'Could not request lab test.' }
  }
}

export async function processLabTest(
  _state: LabTestActionState,
  formData: FormData,
): Promise<LabTestActionState> {
  const session = await getSession()
  if (!session) return { message: 'You must be logged in.' }
  if (session.role !== UserRole.LAB_STAFF && session.role !== UserRole.SUPER_ADMIN) {
    return { message: 'Only lab staff can process tests.' }
  }

  const parsed = ProcessLabTestSchema.safeParse({
    labTestId: formData.get('labTestId'),
    result: formData.get('result'),
  })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  await ready()
  const { labTestId, result } = parsed.data

  try {
    const test = await prisma.labTest.findUnique({
      where: { id: labTestId },
      select: { id: true, patient: { select: { userId: true } }, requestedById: true },
    })
    if (!test) return { message: 'Lab test not found.' }

    await prisma.labTest.update({
      where: { id: labTestId },
      data: {
        status: 'COMPLETED',
        result,
        labStaffId: session.userId,
        resultDate: new Date(),
      },
    })

    await prisma.notification.createMany({
      data: [
        {
          userId: test.patient.userId,
          message: 'Your lab test results are ready.',
          type: 'lab_test_completed',
        },
        {
          userId: test.requestedById,
          message: `Lab test #${labTestId} results are ready.`,
          type: 'lab_test_completed',
        },
      ],
    })

    revalidatePath('/dashboard')
    return { success: true, message: 'Lab test processed successfully.' }
  } catch {
    return { message: 'Could not process lab test.' }
  }
}
