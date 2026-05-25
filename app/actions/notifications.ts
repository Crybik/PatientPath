'use server'

import { revalidatePath } from 'next/cache'
import { prisma, ready } from '@/app/lib/prisma'
import { getSession } from '@/app/lib/session'

export async function markNotificationRead(notificationId: number) {
  const session = await getSession()
  if (!session) return

  await ready()
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.userId },
    data: { isRead: true },
  })
  revalidatePath('/dashboard')
}

export async function markAllNotificationsRead() {
  const session = await getSession()
  if (!session) return

  await ready()
  await prisma.notification.updateMany({
    where: { userId: session.userId, isRead: false },
    data: { isRead: true },
  })
  revalidatePath('/dashboard')
}
