'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SerializedPatient, SerializedReferral } from '@/app/lib/dashboard-types'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/app/ui/motion'
import { ReferralCard } from '@/app/ui/referral-card'
import { StatCard } from '@/app/ui/stat-card'

export function PatientForwards({
  patient,
  initialReferrals,
}: {
  patient: SerializedPatient
  initialReferrals: SerializedReferral[]
}) {
  const [referrals, setReferrals] = useState(initialReferrals)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/forwards', { cache: 'no-store' })
      const payload = await res.json()
      if (res.ok) setReferrals(payload.referrals ?? [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    const t = setInterval(() => void refresh(), 5000)
    return () => clearInterval(t)
  }, [refresh])

  return (
    <div className="space-y-6">
      <FadeInUp>
        <h1 className="text-2xl font-bold text-primary">My Forwards</h1>
        <p className="text-sm text-muted">Track active referrals and status for {patient.fullName}</p>
      </FadeInUp>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active Forwards" value={referrals.length} />
        <StatCard label="Pending" value={referrals.filter(r => r.status === 'PENDING').length} color="text-warning" />
        <StatCard label="Latest Status" value={referrals[0]?.status ?? 'None'} color="text-accent" />
      </div>

      {referrals.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No active forwards. Your doctor will create one when needed.
        </p>
      ) : (
        <StaggerContainer className="space-y-3">
          {referrals.map((r) => (
            <StaggerItem key={r.id}>
              <ReferralCard referral={r} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  )
}
