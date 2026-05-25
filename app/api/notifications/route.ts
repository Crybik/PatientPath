import { getNotifications, getUnreadNotificationCount } from '@/app/lib/clinical-data'
import { getSession } from '@/app/lib/session'

export async function GET() {
  const session = await getSession()
  if (!session) {
    return Response.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const [notifications, unreadCount] = await Promise.all([
    getNotifications(session.userId),
    getUnreadNotificationCount(session.userId),
  ])

  return Response.json({ notifications, unreadCount })
}
