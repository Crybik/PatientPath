import 'server-only'

import { UserRole } from '@/app/generated/prisma'
import { prisma } from '@/app/lib/prisma'
import type { SessionPayload } from '@/app/lib/session'

export async function canAccessReferral(session: SessionPayload, referralId: number) {
  if (session.role === UserRole.SUPER_ADMIN) return true

  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    select: {
      createdById: true,
      currentSpecialistId: true,
      hospitalId: true,
      patient: { select: { userId: true } },
    },
  })

  if (!referral) return false
  if (referral.createdById === session.userId) return true
  if (referral.currentSpecialistId === session.userId) return true
  if (referral.patient.userId === session.userId) return true

  if (session.role === UserRole.SPECIALIST) {
    const staff = await prisma.staffProfile.findUnique({
      where: { userId: session.userId },
      select: { hospitalId: true },
    })
    return staff?.hospitalId === referral.hospitalId
  }

  return false
}

export async function canMutateReferral(session: SessionPayload, referralId: number) {
  if (session.role === UserRole.SUPER_ADMIN) return true

  const referral = await prisma.referral.findUnique({
    where: { id: referralId },
    select: {
      createdById: true,
      hospitalId: true,
      currentSpecialistId: true,
    },
  })

  if (!referral) return false
  if (session.role === UserRole.DOCTOR) return referral.createdById === session.userId
  if (session.role !== UserRole.SPECIALIST) return false
  if (referral.currentSpecialistId === session.userId) return true

  const staff = await prisma.staffProfile.findUnique({
    where: { userId: session.userId },
    select: { hospitalId: true },
  })
  return staff?.hospitalId === referral.hospitalId
}
