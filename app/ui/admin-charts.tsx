'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/app/ui/motion'
import { StatCard } from '@/app/ui/stat-card'
import { IconActivity, IconChart, IconClipboard, IconDatabase, IconFlask, IconPlug, IconPill, IconUsers } from '@/app/ui/icons'

type AdminStats = {
  totalUsers: number
  totalReferrals: number
  totalLabTests: number
  totalPrescriptions: number
  referralsByStatus: { status: string; count: number }[]
  usersByRole: { role: string; count: number }[]
  recentReferrals: { id: number; status: string; date: string }[]
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#d97706',
  ACCEPTED: '#059669',
  FORWARDED: '#2563eb',
  REJECTED: '#dc2626',
  IN_PROGRESS: '#7c3aed',
  COMPLETED: '#009499',
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#003B73',
  DOCTOR: '#059669',
  SPECIALIST: '#d97706',
  PATIENT: '#009499',
  LAB_STAFF: '#dc2626',
  PHARMACY_STAFF: '#7c3aed',
}

export function AdminOverviewCharts({ stats }: { stats: AdminStats }) {
  const chartsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chartsRef.current) {
      const cards = chartsRef.current.querySelectorAll('[data-chart]')
      gsap.fromTo(cards, { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, stagger: 0.15, ease: 'power3.out', delay: 0.3 })
    }
  }, [])

  const pieData = stats.referralsByStatus.map((r) => ({
    name: r.status.charAt(0) + r.status.slice(1).toLowerCase().replace('_', ' '),
    value: r.count,
    color: STATUS_COLORS[r.status] ?? '#6b7f8e',
  }))

  const roleData = stats.usersByRole.map((u) => ({
    name: u.role.replace(/_/g, ' ').split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
    value: u.count,
    color: ROLE_COLORS[u.role] ?? '#6b7f8e',
  }))

  const dateMap = new Map<string, Record<string, number>>()
  for (const r of stats.recentReferrals) {
    if (!dateMap.has(r.date)) dateMap.set(r.date, {})
    const entry = dateMap.get(r.date)!
    entry[r.status] = (entry[r.status] ?? 0) + 1
  }
  const barData = Array.from(dateMap.entries())
    .map(([date, statuses]) => ({ date: date.slice(5), ...statuses }))
    .slice(-10)

  return (
    <div className="space-y-8">
      <FadeInUp>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-primary to-primary-soft p-2.5 shadow-lg shadow-primary/10">
            <IconChart className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Admin Dashboard</h1>
            <p className="text-sm text-muted">System overview and analytics</p>
          </div>
        </div>
      </FadeInUp>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={<IconUsers className="w-4 h-4" />} />
        <StatCard label="Referrals" value={stats.totalReferrals} icon={<IconClipboard className="w-4 h-4" />} color="text-accent" />
        <StatCard label="Lab Tests" value={stats.totalLabTests} icon={<IconFlask className="w-4 h-4" />} color="text-warning" />
        <StatCard label="Prescriptions" value={stats.totalPrescriptions} icon={<IconPill className="w-4 h-4" />} color="text-success" />
      </div>

      {/* Charts */}
      <div ref={chartsRef} className="grid gap-6 lg:grid-cols-2">
        <div data-chart className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <IconActivity className="w-4 h-4 text-accent" />
            Referrals by Status
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" strokeWidth={2} stroke="#fff">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e0e4e3', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted text-center py-12">No referral data yet</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-muted">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div data-chart className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <IconUsers className="w-4 h-4 text-accent" />
            Users by Role
          </h3>
          {roleData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" strokeWidth={2} stroke="#fff">
                  {roleData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e0e4e3', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-muted text-center py-12">No user data yet</p>
          )}
          <div className="flex flex-wrap gap-3 mt-2 justify-center">
            {roleData.map((d) => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
                <span className="text-muted">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      {barData.length > 0 && (
        <div data-chart className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
            <IconChart className="w-4 h-4 text-accent" />
            Recent Activity
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e3" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#6b7f8e' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6b7f8e' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e0e4e3', fontSize: 12 }} />
              <Bar dataKey="PENDING" fill="#d97706" radius={[3, 3, 0, 0]} name="Pending" />
              <Bar dataKey="ACCEPTED" fill="#059669" radius={[3, 3, 0, 0]} name="Accepted" />
              <Bar dataKey="COMPLETED" fill="#009499" radius={[3, 3, 0, 0]} name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Quick Links */}
      <StaggerContainer className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { href: '/dashboard/users', label: 'Manage Users', desc: 'View, edit, freeze users', icon: <IconUsers className="w-5 h-5" /> },
          { href: '/dashboard/all-referrals', label: 'All Referrals', desc: 'System-wide referrals', icon: <IconClipboard className="w-5 h-5" /> },
          { href: '/dashboard/integrations', label: 'Integrations', desc: 'API endpoints & worker', icon: <IconPlug className="w-5 h-5" /> },
          { href: '/dashboard/db', label: 'Database', desc: 'Browse DB tables', icon: <IconDatabase className="w-5 h-5" /> },
        ].map((link) => (
          <StaggerItem key={link.href}>
            <Link href={link.href} className="group flex items-start gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm transition-all hover:border-accent/40 hover:shadow-md">
              <div className="rounded-lg bg-surface-elevated p-2 text-muted group-hover:text-accent group-hover:bg-accent/5 transition-colors">
                {link.icon}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-primary group-hover:text-accent transition-colors">{link.label}</h4>
                <p className="mt-0.5 text-xs text-muted">{link.desc}</p>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerContainer>
    </div>
  )
}
