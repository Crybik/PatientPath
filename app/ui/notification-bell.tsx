'use client'

import { useCallback, useEffect, useState } from 'react'
import { markAllNotificationsRead } from '@/app/actions/notifications'
import type { SerializedNotification } from '@/app/lib/dashboard-types'
import { formatRelative } from '@/app/ui/dashboard-format'
import { IconBell, IconCheckAll } from '@/app/ui/icons'
import { AnimatePresence, motion } from '@/app/ui/motion'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<SerializedNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
        setUnreadCount(data.unreadCount ?? 0)
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), 10000)
    return () => clearInterval(timer)
  }, [refresh])

  async function handleMarkAllRead() {
    await markAllNotificationsRead()
    setUnreadCount(0)
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-muted transition-all hover:bg-surface-elevated hover:text-primary"
      >
        <IconBell className="w-[18px] h-[18px]" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white shadow-sm shadow-accent/30"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-border bg-surface p-1.5 shadow-xl"
          >
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="text-sm font-semibold text-primary">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="flex items-center gap-1 text-xs font-medium text-accent hover:text-accent-bright transition-colors">
                  <IconCheckAll className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted">No notifications</p>
              ) : (
                notifications.slice(0, 10).map((n) => (
                  <div
                    key={n.id}
                    className={`rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      n.isRead ? 'text-muted' : 'bg-accent/5 text-primary'
                    }`}
                  >
                    <p className="leading-snug text-xs">{n.message}</p>
                    <p className="mt-1 text-[11px] text-muted">{formatRelative(n.createdAt)}</p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}
    </div>
  )
}
