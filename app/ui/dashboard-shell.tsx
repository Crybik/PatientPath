'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { logout } from '@/app/actions/auth'
import type { DashboardRole } from '@/app/lib/dashboard-types'
import { ROLE_LABELS } from '@/app/lib/roles'
import { IconLogout } from '@/app/ui/icons'
import { NotificationBell } from '@/app/ui/notification-bell'

type NavItem = {
  href: string
  label: string
  icon?: React.ReactNode
}

export function DashboardShell({
  username,
  role,
  nav,
  children,
}: {
  username: string
  role: DashboardRole
  nav: NavItem[]
  children: React.ReactNode
}) {
  const roleLabel = ROLE_LABELS[role as keyof typeof ROLE_LABELS]
  const sidebarRef = useRef<HTMLElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  useEffect(() => {
    if (sidebarRef.current) {
      gsap.fromTo(
        sidebarRef.current,
        { x: -20, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.6, ease: 'power3.out' },
      )
    }
  }, [])

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* Mobile header */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
          <div className="flex items-center gap-3">
            <Image
              src="/jordan-university-hospital-logo.png"
              alt="Logo"
              width={32}
              height={32}
              priority
              style={{ width: 32, height: 32 }}
              className="rounded-lg"
            />
            <span className="text-sm font-bold text-primary">PatientPath</span>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="rounded-lg p-2 text-muted hover:bg-surface-elevated hover:text-primary"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <aside
          ref={sidebarRef}
          className={`${mobileOpen ? 'block' : 'hidden'} border-b border-border bg-surface px-4 py-4 shadow-sm lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:px-4 lg:py-5`}
        >
          {/* Logo */}
          <div className="hidden lg:block">
            <div className="flex items-center gap-3 px-2 pb-5 border-b border-border">
              <Image
                src="/jordan-university-hospital-logo.png"
                alt="Logo"
                width={38}
                height={38}
                priority
                style={{ width: 38, height: 38 }}
                className="rounded-lg"
              />
              <div>
                <p className="text-sm font-bold text-primary">PatientPath</p>
                <p className="text-[11px] text-muted">{roleLabel}</p>
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="mt-4 flex flex-col gap-0.5">
            {nav.map((item) => {
              const active = isActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? 'bg-accent/10 text-accent'
                      : 'text-primary-soft hover:bg-surface-elevated hover:text-primary'
                  }`}
                >
                  <span className={active ? 'text-accent' : 'text-muted group-hover:text-accent'}>{item.icon}</span>
                  {item.label}
                  {active && <div className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="mt-auto pt-5 hidden lg:block border-t border-border">
            <div className="flex items-center justify-between px-2">
              <div>
                <p className="text-sm font-semibold text-primary">{username}</p>
                <p className="text-[11px] text-muted">{roleLabel}</p>
              </div>
              <NotificationBell />
            </div>

            <form action={logout} className="mt-3">
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-all hover:border-danger/40 hover:bg-danger/5 hover:text-danger"
              >
                <IconLogout className="w-4 h-4" />
                Log out
              </button>
            </form>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
