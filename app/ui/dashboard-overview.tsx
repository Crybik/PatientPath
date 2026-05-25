'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { DashboardRole } from '@/app/lib/dashboard-types'
import { FadeInUp } from '@/app/ui/motion'
import { StatCard } from '@/app/ui/stat-card'

type Props = {
  role: DashboardRole
  stats: Record<string, number | string>
  patientName?: string
}

const quickLinks: Record<string, { href: string; label: string; description: string }[]> = {
  DOCTOR: [
    { href: '/dashboard/forward', label: 'Create Forward Note', description: 'Route a patient to a specialist clinic' },
    { href: '/dashboard/referrals', label: 'View My Referrals', description: 'See all referrals you have created' },
  ],
  SPECIALIST: [
    { href: '/dashboard/queue', label: 'Referral Queue', description: 'Accept, reject, or forward referrals' },
  ],
  PATIENT: [
    { href: '/dashboard/forwards', label: 'My Forwards', description: 'Track your active referrals' },
    { href: '/dashboard/visits', label: 'Visit History', description: 'View your past hospital visits' },
  ],
  LAB_STAFF: [
    { href: '/dashboard/lab-tests', label: 'Lab Tests', description: 'Process pending lab test requests' },
  ],
  PHARMACY_STAFF: [
    { href: '/dashboard/prescriptions', label: 'Prescriptions', description: 'Dispense pending prescriptions' },
  ],
  SUPER_ADMIN: [
    { href: '/dashboard/users', label: 'Manage Users', description: 'View, activate, and change user roles' },
    { href: '/dashboard/all-referrals', label: 'All Referrals', description: 'View system-wide referral activity' },
    { href: '/dashboard/lab-tests', label: 'Lab Tests', description: 'View all lab test activity' },
    { href: '/dashboard/prescriptions', label: 'Prescriptions', description: 'View all prescription activity' },
  ],
}

const greetings: Record<string, string> = {
  DOCTOR: 'Welcome back, Doctor',
  SPECIALIST: 'Specialist Dashboard',
  PATIENT: 'Your Health Dashboard',
  LAB_STAFF: 'Lab Dashboard',
  PHARMACY_STAFF: 'Pharmacy Dashboard',
  SUPER_ADMIN: 'Admin Dashboard',
}

export function DashboardOverview({ role, stats, patientName }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (containerRef.current) {
      const cards = containerRef.current.querySelectorAll('[data-stat]')
      gsap.fromTo(cards, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, stagger: 0.1, ease: 'power2.out' })
    }
  }, [])

  return (
    <div className="space-y-8">
      <FadeInUp>
        <h1 className="text-2xl font-bold text-primary">
          {patientName ? `Hello, ${patientName}` : greetings[role]}
        </h1>
        <p className="mt-1 text-sm text-muted">Here&apos;s a quick overview of your activity.</p>
      </FadeInUp>

      {/* Stats */}
      <div ref={containerRef} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} data-stat>
            <StatCard
              label={key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ')}
              value={value}
              color={key === 'pending' ? 'text-warning' : key === 'completed' || key === 'accepted' || key === 'dispensed' ? 'text-success' : 'text-accent'}
            />
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div>
        <h2 className="text-lg font-semibold text-primary mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(quickLinks[role] ?? []).map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:border-accent/40 hover:shadow-md"
            >
              <h3 className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">
                {link.label}
              </h3>
              <p className="mt-1 text-xs text-muted">{link.description}</p>
              <span className="mt-3 inline-block text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                Go →
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
