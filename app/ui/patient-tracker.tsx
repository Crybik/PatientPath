'use client'

import { useCallback, useEffect, useState } from 'react'
import type {
  SerializedPatient,
  SerializedReferral,
  SerializedVisit,
} from '@/app/lib/dashboard-types'
import { formatDate, genderLabel } from '@/app/ui/dashboard-format'
import { ReferralCard } from '@/app/ui/referral-card'

export function PatientTracker({
  patient,
  visits,
  initialReferrals,
}: {
  patient: SerializedPatient
  visits: SerializedVisit[]
  initialReferrals: SerializedReferral[]
}) {
  const [referrals, setReferrals] = useState(initialReferrals)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/forwards', { cache: 'no-store' })
      const payload = await response.json()
      if (response.ok) {
        setReferrals(payload.referrals ?? [])
        setMessage(null)
      }
    } catch {
      setMessage('Could not refresh forwards.')
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [refresh])

  return (
    <div className="space-y-8">
      <section id="patient-dashboard" className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Patient Dashboard
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-primary">
            {patient.fullName}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Uni ID {patient.uniId} - {genderLabel(patient.gender)} - DOB{' '}
            {formatDate(patient.dob)}
          </p>
        </div>

        {message && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            {message}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-accent-soft bg-surface p-4 shadow-sm">
            <p className="text-sm text-muted">Forwards</p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {referrals.length}
            </p>
          </div>
          <div className="rounded-lg border border-accent-soft bg-surface p-4 shadow-sm">
            <p className="text-sm text-muted">Old visits</p>
            <p className="mt-1 text-2xl font-semibold text-primary">
              {visits.length}
            </p>
          </div>
          <div className="rounded-lg border border-accent-soft bg-surface p-4 shadow-sm">
            <p className="text-sm text-muted">Latest status</p>
            <p className="mt-1 text-lg font-semibold text-primary">
              {referrals[0]?.status ?? 'None'}
            </p>
          </div>
        </div>
      </section>

      <section id="patient-forwards" className="space-y-4">
        <h2 className="text-xl font-semibold text-primary">Forward tracking</h2>
        {referrals.length === 0 ? (
          <p className="rounded-lg border border-accent-soft bg-surface p-4 text-sm text-muted">
            No forwards have been created for this patient yet.
          </p>
        ) : (
          <div className="space-y-4">
            {referrals.map((referral) => (
              <ReferralCard key={referral.id} referral={referral} />
            ))}
          </div>
        )}
      </section>

      <section id="visit-history" className="space-y-4">
        <h2 className="text-xl font-semibold text-primary">Visit history</h2>
        {visits.length === 0 ? (
          <p className="rounded-lg border border-accent-soft bg-surface p-4 text-sm text-muted">
            No old visits are recorded.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {visits.map((visit) => (
              <article
                key={visit.id}
                className="rounded-lg border border-accent-soft bg-surface p-4 shadow-sm"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-semibold text-primary">
                    {visit.hospitalName}
                  </h3>
                  <p className="text-sm text-muted">{formatDate(visit.visitedAt)}</p>
                </div>
                <p className="mt-1 text-sm text-primary-soft">
                  {visit.clinicName} - {visit.doctorName}
                </p>
                <p className="mt-3 text-sm font-semibold text-primary">
                  {visit.summary}
                </p>
                <p className="mt-1 text-sm text-muted">{visit.notes}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
