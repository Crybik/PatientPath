'use server'

import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { redirect } from 'next/navigation'
import { prisma, ready } from '@/app/lib/prisma'
import { createSession, destroySession } from '@/app/lib/session'
import { REGISTERABLE_ROLES } from '@/app/lib/roles'

const UsernamePassword = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters.')
    .max(64, 'Username must be at most 64 characters.')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Only letters, numbers, "_", ".", "-" allowed.')
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .max(200, 'Password is too long.'),
})

const RegisterSchema = UsernamePassword.extend({
  role: z.enum(REGISTERABLE_ROLES),
})

export type AuthFormState =
  | {
      errors?: {
        username?: string[]
        password?: string[]
        role?: string[]
      }
      message?: string
    }
  | undefined

export async function register(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = RegisterSchema.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
    role: formData.get('role'),
  })
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors }
  }

  const { username, password, role } = parsed.data

  try {
    await ready()

    const existing = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    })
    if (existing) {
      return { message: 'Username is already taken.' }
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { username, passwordHash, role },
      select: { id: true, username: true, role: true },
    })

    await createSession(user.id, user.username, user.role)
  } catch (err) {
    console.error('register failed', err)
    return { message: 'Something went wrong. Please try again.' }
  }

  redirect('/dashboard')
}

export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = UsernamePassword.safeParse({
    username: formData.get('username'),
    password: formData.get('password'),
  })
  if (!parsed.success) {
    // Don't leak which field was wrong on login.
    return { message: 'Invalid username or password.' }
  }

  const { username, password } = parsed.data

  try {
    await ready()

    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, username: true, passwordHash: true, role: true },
    })
    if (!user) {
      return { message: 'Invalid username or password.' }
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
