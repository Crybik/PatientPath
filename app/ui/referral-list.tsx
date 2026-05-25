'use client'

import { useState } from 'react'
import type { SerializedReferral } from '@/app/lib/dashboard-types'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/app/ui/motion'
import { ReferralCard } from '@/app/ui/referral-card'
import { StatCard } from '@/app/ui/stat-card'

export function ReferralList({
  title,
  subtitle,
  referrals,
}: {
  title: string
  subtitle: string
  referrals: SerializedReferral[]
}) {
  const [filter, setFilter] = useState('ALL')
  const filters = ['ALL', 'PENDING', 'ACCEPTED', 'FORWARDED', 'REJECTED', 'COMPLETED']
  const filtered = filter === 'ALL' ? referrals : referrals.filter((r) => r.status === filter)

  return (
    <div className="space-y-6">
      <FadeInUp>
        <h1 className="text-2xl font-bold text-primary">{title}</h1>
        <p className="text-sm text-muted">{subtitle}</p>
      </FadeInUp>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={referrals.length} />
        <StatCard label="Pending" value={referrals.filter(r => r.status === 'PENDING').length} color="text-warning" />
        <StatCard label="Accepted" value={referrals.filter(r => r.status === 'ACCEPTED').length} color="text-success" />
        <StatCard label="Completed" value={referrals.filter(r => r.status === 'COMPLETED').length} color="text-accent" />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f
                ? 'bg-accent text-white shadow-sm'
                : 'border border-border text-muted hover:border-accent/40 hover:text-primary'
            }`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No referrals match this filter.
        </p>
      ) : (
        <StaggerContainer className="space-y-3">
          {filtered.map((r) => (
            <StaggerItem key={r.id}>
              <ReferralCard referral={r} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  )
}
