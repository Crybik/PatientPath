'use client'

import type { SerializedPatient, SerializedVisit } from '@/app/lib/dashboard-types'
import { formatDate } from '@/app/ui/dashboard-format'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/app/ui/motion'

export function PatientVisits({
  patient,
  visits,
}: {
  patient: SerializedPatient
  visits: SerializedVisit[]
}) {
  return (
    <div className="space-y-6">
      <FadeInUp>
        <h1 className="text-2xl font-bold text-primary">Visit History</h1>
        <p className="text-sm text-muted">{visits.length} past visits recorded for {patient.fullName}</p>
      </FadeInUp>

      {visits.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No past visits recorded.
        </p>
      ) : (
        <StaggerContainer className="grid gap-4 lg:grid-cols-2">
          {visits.map((v) => (
            <StaggerItem key={v.id}>
              <article className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:shadow-md hover:border-accent/30">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-bold text-primary">{v.hospitalName}</h3>
                    <p className="mt-0.5 text-xs text-primary-soft">{v.clinicName} · {v.doctorName}</p>
                  </div>
                  <span className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-muted">
                    {formatDate(v.visitedAt)}
                  </span>
                </div>
                <div className="mt-3 border-t border-border-subtle pt-3">
                  <p className="text-sm font-semibold text-primary">{v.summary}</p>
                  <p className="mt-1 text-xs text-muted leading-relaxed">{v.notes}</p>
                </div>
              </article>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  )
}
