'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma, ready } from '@/app/lib/prisma'
import { createSession, destroySession } from '@/app/lib/session'

const UsernamePassword = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(64, 'Username must be at most 64 characters.')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Only letters, numbers, "_", ".", "-" allowed.')
    .trim()
    .transform((v) => v.toLowerCase()),
  password: z
    .string()
    .min(4, 'Password must be at least 4 characters.')
    .max(200, 'Password is too long.'),
})

export type AuthFormState =
  | {
      errors?: {
        username?: string[]
        password?: string[]
      }
      message?: string
    }
  | undefined

export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = UsernamePassword.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    return { message: 'Invalid username or password.' }
  }

  const { username, password } = parsed.data

  try {
    await ready()

    // Case-insensitive login
    const user = await prisma.user.findFirst({
      where: { username: { equals: username, mode: 'insensitive' } },
      select: { id: true, username: true, passwordHash: true, role: true, isActive: true },
    })
    if (!user) {
      return { message: 'Invalid username or password.' }
    }

    if (!user.isActive) {
      return { message: 'This account has been deactivated. Contact an administrator.' }
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return { message: 'Invalid username or password.' }
    }

    await createSession(user.id, user.username, user.role)
  } catch (err) {
    console.error('login failed', err)
    return { message: 'Something went wrong. Please try again.' }
  }

  redirect('/dashboard')
}

export async function logout() {
  await destroySession()
  redirect('/login')
}
