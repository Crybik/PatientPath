import 'server-only'
import { PrismaClient } from '@/app/generated/prisma'

declare global {
  var __prisma: PrismaClient | undefined
  var __prismaBootstrap: Promise<void> | undefined
}

function createClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })
}

export const prisma = global.__prisma ?? createClient()

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma
}

/**
 * One-time per-process bootstrap:
 *  - Promote `admin` (if present) to SUPER_ADMIN.
 *  - If no super admin exists, promote the oldest user.
 *  - Posts table is already removed via the Prisma schema.
 */
async function bootstrap() {
  await prisma.user.updateMany({
    where: { username: 'admin' },
    data: { role: 'SUPER_ADMIN' },
  })

  const hasSuperAdmin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true },
  })

  if (!hasSuperAdmin) {
    const oldest = await prisma.user.findFirst({
      orderBy: { id: 'asc' },
      select: { id: true },
    })
    if (oldest) {
      await prisma.user.update({
        where: { id: oldest.id },
        data: { role: 'SUPER_ADMIN' },
      })
    }
  }
}

export function ready(): Promise<void> {
  if (!global.__prismaBootstrap) {
    global.__prismaBootstrap = bootstrap().catch((err) => {
      global.__prismaBootstrap = undefined
      throw err
    })
  }
  return global.__prismaBootstrap
}
