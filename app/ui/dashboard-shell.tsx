'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { logout } from '@/app/actions/auth'
import type { DashboardRole } from '@/app/lib/dashboard-types'
import { ROLE_LABELS } from '@/app/lib/roles'
import { IconClose, IconLogout, IconMenu } from '@/app/ui/icons'
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

  useEffect(() => {
    if (!mobileOpen) return

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = originalOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileOpen])

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  function closeMobileNav() {
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-surface/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
          <Link href="/dashboard" onClick={closeMobileNav} className="flex min-w-0 items-center">
            <Image
              src="/PatientPath.png"
              alt="Logo"
              width={140}
              height={42}
              priority
              style={{ width: 'auto', height: 32 }}
              className="h-8 max-w-[150px] object-contain"
            />
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-controls="dashboard-sidebar"
              aria-expanded={mobileOpen}
              aria-label="Open navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted transition-all hover:border-accent/40 hover:bg-surface-elevated hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <IconMenu className="h-5 w-5" />
            </button>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close navigation menu"
          onClick={() => setMobileOpen(false)}
          className={`${mobileOpen ? 'block' : 'hidden'} fixed inset-0 z-40 bg-primary/35 backdrop-blur-[2px] lg:hidden`}
        />

        {/* Sidebar */}
        <aside
          id="dashboard-sidebar"
          ref={sidebarRef}
          className={`${mobileOpen ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-50 h-dvh w-[calc(100vw-2rem)] max-w-80 flex-col border-r border-border bg-surface shadow-2xl lg:sticky lg:top-0 lg:z-auto lg:flex lg:h-screen lg:w-72 lg:max-w-none lg:shrink-0 lg:shadow-sm`}
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-4 lg:hidden">
            <Link href="/dashboard" onClick={closeMobileNav} className="flex min-w-0 items-center">
              <Image
                src="/PatientPath.png"
                alt="Logo"
                width={140}
                height={42}
                priority
                style={{ width: 'auto', height: 32 }}
                className="h-8 max-w-[150px] object-contain"
              />
            </Link>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted transition-all hover:border-accent/40 hover:bg-surface-elevated hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent/40"
            >
              <IconClose className="h-5 w-5" />
            </button>
          </div>

          {/* Logo */}
          <div className="hidden border-b border-border px-4 py-5 lg:block">
            <Link href="/dashboard" onClick={closeMobileNav} className="flex flex-col items-center gap-2 text-center">
              <Image
                src="/PatientPath.png"
                alt="Logo"
                width={150}
                height={45}
                priority
                style={{ width: '100%', maxWidth: '140px', height: 'auto' }}
                className="object-contain"
              />
              <span className="max-w-full text-balance text-xs text-muted">{roleLabel}</span>
            </Link>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
            <div className="flex flex-col gap-1">
              {nav.map((item) => {
                const active = isActive(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobileNav}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium leading-5 transition-all focus:outline-none focus:ring-2 focus:ring-accent/40 ${
                      active
                        ? 'bg-accent/10 text-accent'
                        : 'text-primary-soft hover:bg-surface-elevated hover:text-primary'
                    }`}
                  >
                    <span className={`shrink-0 ${active ? 'text-accent' : 'text-muted group-hover:text-accent'}`}>{item.icon}</span>
                    <span className="min-w-0 flex-1 break-words">{item.label}</span>
                    {active && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
                  </Link>
                )
              })}
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <Link href="/support" onClick={closeMobileNav} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-primary-soft transition-all hover:bg-surface-elevated hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent/40">
                Contact Support
              </Link>
              <Link href="/about" onClick={closeMobileNav} className="block rounded-lg px-3 py-2.5 text-sm font-medium text-primary-soft transition-all hover:bg-surface-elevated hover:text-primary focus:outline-none focus:ring-2 focus:ring-accent/40">
                About
              </Link>
            </div>
          </nav>

          {/* User section */}
          <div className="border-t border-border px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary">{username}</p>
                <p className="text-[11px] text-muted">{roleLabel}</p>
              </div>
              <div className="hidden lg:block">
                <NotificationBell />
              </div>
            </div>

            <form action={logout} className="mt-3">
              <button
                type="submit"
                className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted transition-all hover:border-danger/40 hover:bg-danger/5 hover:text-danger focus:outline-none focus:ring-2 focus:ring-danger/20"
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
