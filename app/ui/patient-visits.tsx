'use client'

import type {
  SerializedLabTest,
  SerializedPatient,
  SerializedPrescription,
  SerializedReferral,
  SerializedVisit,
} from '@/app/lib/dashboard-types'
import { formatDate, formatDateTime, statusColor, statusLabel } from '@/app/ui/dashboard-format'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/app/ui/motion'

export function PatientVisits({
  patient,
  visits,
  referrals = [],
  labTests = [],
  prescriptions = [],
}: {
  patient: SerializedPatient
  visits: SerializedVisit[]
  referrals?: SerializedReferral[]
  labTests?: SerializedLabTest[]
  prescriptions?: SerializedPrescription[]
}) {
  const totalRecords = visits.length + referrals.length + labTests.length + prescriptions.length

  return (
    <div className="space-y-6">
      <FadeInUp>
        <h1 className="text-2xl font-bold text-primary">Medical History</h1>
        <p className="text-sm text-muted">{totalRecords} records for {patient.fullName}</p>
      </FadeInUp>

      {totalRecords === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No medical history records are available yet.
        </p>
      ) : (
        <div className="space-y-8">
          {referrals.length > 0 && (
            <HistorySection title="Referrals">
              {referrals.map((referral) => (
                <article key={referral.id} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-primary">{referral.hospital.name}</h3>
                      <p className="mt-0.5 text-xs text-primary-soft">{referral.clinic.name} · {referral.doctorName}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusColor(referral.status)}`}>
                      {statusLabel(referral.status)}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-primary-soft">{referral.doctorNote}</p>
                  {referral.feedback && <p className="mt-2 text-sm text-success">{referral.feedback}</p>}
                </article>
              ))}
            </HistorySection>
          )}

          {visits.length > 0 && (
            <HistorySection title="Visits">
              {visits.map((visit) => (
                <article key={visit.id} className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-all hover:shadow-md hover:border-accent/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-bold text-primary">{visit.hospitalName}</h3>
                      <p className="mt-0.5 text-xs text-primary-soft">{visit.clinicName} · {visit.doctorName}</p>
                    </div>
                    <span className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-medium text-muted">
                      {formatDate(visit.visitedAt)}
                    </span>
                  </div>
                  <div className="mt-3 border-t border-border-subtle pt-3">
                    <p className="text-sm font-semibold text-primary">{visit.summary}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted">{visit.notes}</p>
                  </div>
                </article>
              ))}
            </HistorySection>
          )}

          {labTests.length > 0 && (
            <HistorySection title="Lab Results">
              {labTests.map((test) => (
                <article key={test.id} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                  <div className="flex justify-between gap-3">
                    <h3 className="text-sm font-bold text-primary">{test.testType}</h3>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">{test.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted">Requested: {formatDateTime(test.requestDate)}</p>
                  <p className="mt-3 text-sm text-primary-soft">{test.result ?? 'Result pending.'}</p>
                </article>
              ))}
            </HistorySection>
          )}

          {prescriptions.length > 0 && (
            <HistorySection title="Prescriptions">
              {prescriptions.map((rx) => (
                <article key={rx.id} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
                  <div className="flex justify-between gap-3">
                    <h3 className="text-sm font-bold text-primary">{rx.medicationName}</h3>
                    <span className="rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
                      {rx.isDispensed ? 'Dispensed' : 'Pending'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-primary-soft">{rx.dosage} · {rx.frequency} · {rx.duration}</p>
                  <p className="mt-1 text-xs text-muted">Prescribed: {formatDateTime(rx.createdAt)}</p>
                </article>
              ))}
            </HistorySection>
          )}
        </div>
      )}
    </div>
  )
}

function HistorySection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">{title}</h2>
      <StaggerContainer className="grid gap-4 lg:grid-cols-2">
        {Array.isArray(children)
          ? children.map((child, index) => <StaggerItem key={index}>{child}</StaggerItem>)
          : <StaggerItem>{children}</StaggerItem>}
      </StaggerContainer>
    </section>
  )
}
