'use client'

import { useState } from 'react'
import type { SerializedReferral } from '@/app/lib/dashboard-types'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/app/ui/motion'
import { ReferralCard } from '@/app/ui/referral-card'
import { ReferralClinicalActions } from '@/app/ui/referral-clinical-actions'
import { StatCard } from '@/app/ui/stat-card'
import { IconSearch } from '@/app/ui/icons'

function matchesReferralSearch(referral: SerializedReferral, search: string) {
  const normalized = search.trim().toLowerCase()
  if (!normalized) return true
  const haystack = [
    referral.patient.fullName,
    referral.patient.uniId,
    referral.status,
    referral.hospital.name,
    referral.hospital.shortName,
    referral.clinic.name,
    referral.createdAt.slice(0, 10),
    referral.scheduledAt?.slice(0, 10) ?? '',
  ].join(' ').toLowerCase()
  return haystack.includes(normalized)
}

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
  const [search, setSearch] = useState('')
  const filters = ['ALL', 'PENDING', 'ACCEPTED', 'SCHEDULED', 'FORWARDED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED']
  const filtered = referrals.filter((r) => {
    const statusMatches = filter === 'ALL' || r.status === filter
    return statusMatches && matchesReferralSearch(r, search)
  })

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

      <div className="flex flex-col gap-3">
        <label className="relative block">
          <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by student, ID, date, status, hospital, or clinic"
            className="w-full rounded-lg border border-border bg-surface px-9 py-2 text-sm text-primary outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
          />
        </label>
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
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No referrals match this filter.
        </p>
      ) : (
        <StaggerContainer className="space-y-3">
          {filtered.map((r) => (
            <StaggerItem key={r.id}>
              <ReferralCard referral={r}>
                <ReferralClinicalActions referral={r} />
              </ReferralCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  )
}
