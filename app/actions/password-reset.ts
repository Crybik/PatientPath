'use server'

import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { redirect } from 'next/navigation'
import { appUrl, sendPasswordResetEmail } from '@/app/lib/mailer'
import { prisma, ready } from '@/app/lib/prisma'

export type PasswordResetState =
  | {
      success?: boolean
      message?: string
      devResetUrl?: string
      errors?: Record<string, string[] | undefined>
    }
  | undefined

const RequestResetSchema = z.object({
  emailOrUsername: z.string().trim().min(3, 'Enter your email or username.').max(160),
})

const ResetPasswordSchema = z.object({
  token: z.string().trim().min(20),
  password: z.string().min(4, 'Password must be at least 4 characters.').max(200),
})

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export async function requestPasswordReset(
  _state: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const parsed = RequestResetSchema.safeParse({
    emailOrUsername: formData.get('emailOrUsername'),
  })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  await ready()
  const value = parsed.data.emailOrUsername
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: value, mode: 'insensitive' } },
        { email: { equals: value, mode: 'insensitive' } },
      ],
      isActive: true,
    },
    select: { id: true, email: true },
  })

  let devResetUrl: string | undefined
  if (user?.email) {
    const token = randomBytes(32).toString('base64url')
    const resetUrl = `${appUrl()}/reset-password/${token}`
    devResetUrl = process.env.NODE_ENV !== 'production' ? resetUrl : undefined

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })

    await sendPasswordResetEmail(user.email, resetUrl)
  }

  return {
    success: true,
    message: 'If the account exists, a password reset link has been sent.',
    devResetUrl,
  }
}

export async function resetPassword(
  _state: PasswordResetState,
  formData: FormData,
): Promise<PasswordResetState> {
  const parsed = ResetPasswordSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  })
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors }

  await ready()
  const tokenHash = hashToken(parsed.data.token)
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return { message: 'This reset link is invalid or expired.' }
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10)
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, plainPassword: null },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ])

  redirect('/login')
}
