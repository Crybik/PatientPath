import 'server-only'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { USER_ROLES, type UserRole } from '@/app/lib/roles'

const SESSION_COOKIE = 'session'
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7

function getKey() {
  const secret = process.env.SESSION_SECRET
  if (!secret) {
    throw new Error('SESSION_SECRET is not set')
  }
  return new TextEncoder().encode(secret)
}

export type SessionPayload = {
  userId: number
  username: string
  role: UserRole
}

function isUserRole(value: unknown): value is UserRole {
  return (
    typeof value === 'string' &&
    (USER_ROLES as readonly string[]).includes(value)
  )
}

async function encrypt(payload: SessionPayload) {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getKey())
}

async function decrypt(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getKey(), { algorithms: ['HS256'] })
    if (
      typeof payload.userId !== 'number' ||
      typeof payload.username !== 'string' ||
      !isUserRole(payload.role)
    ) {
      return null
    }
    return {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
    }
  } catch {
    return null
  }
}

export async function createSession(
  userId: number,
  username: string,
  role: UserRole,
) {
  const token = await encrypt({ userId, username, role })
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  })
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(SESSION_COOKIE)?.value
  return decrypt(token)
}

export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
}
