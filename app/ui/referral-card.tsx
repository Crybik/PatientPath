import Image from 'next/image'
import type { SerializedReferral } from '@/app/lib/dashboard-types'
import { formatDateTime, statusLabel } from '@/app/ui/dashboard-format'

const statusClass: Record<SerializedReferral['status'], string> = {
  PENDING: 'border-amber-200 bg-amber-50 text-amber-800',
  ACCEPTED: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  FORWARDED: 'border-sky-200 bg-sky-50 text-sky-800',
}

export function ReferralCard({
  referral,
  children,
}: {
  referral: SerializedReferral
  children?: React.ReactNode
}) {
  return (
    <article className="rounded-lg border border-accent-soft bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-accent-soft bg-background">
            {referral.hospital.logoPath ? (
              <Image
                src={referral.hospital.logoPath}
                alt={`${referral.hospital.name} logo`}
                fill
                sizes="56px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm font-semibold text-primary">
                {referral.hospital.shortName}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-primary">
                {referral.patient.fullName}
              </h3>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass[referral.status]}`}
              >
                {statusLabel(referral.status)}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {referral.hospital.name} - {referral.clinic.name}
            </p>
            <p className="mt-1 text-sm font-medium text-primary-soft">
              {formatDateTime(referral.scheduledAt)}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-accent-soft bg-background px-3 py-2 text-sm text-primary-soft">
          Uni ID <span className="font-semibold">{referral.patient.uniId}</span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Doctor note
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-primary-soft">
            {referral.doctorNote}
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Specialist note
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-primary-soft">
            {referral.specialistNote ?? 'No specialist note yet.'}
          </p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">
          Timeline
        </p>
        <div className="mt-3 space-y-3">
          {referral.events.map((event) => (
            <div key={event.id} className="flex gap-3">
              <div className="mt-1 h-2.5 w-2.5 rounded-full bg-accent" />
              <div>
                <p className="text-sm font-semibold text-primary">
                  {event.type === 'CREATED'
                    ? 'Forward created'
                    : event.type === 'ACCEPTED'
                      ? 'Accepted by specialist'
                      : 'Forwarded to another clinic'}
                </p>
                <p className="text-xs text-muted">
                  {event.actorName} - {formatDateTime(event.createdAt)}
                </p>
                {(event.toClinicName || event.slotStartsAt) && (
                  <p className="mt-1 text-sm text-primary-soft">
                    {event.fromClinicName ? `${event.fromClinicName} to ` : ''}
                    {event.toClinicName ?? referral.clinic.name}
                    {event.slotStartsAt
                      ? ` - ${formatDateTime(event.slotStartsAt)}`
                      : ''}
                  </p>
                )}
                {event.note && (
                  <p className="mt-1 whitespace-pre-wrap text-sm text-primary-soft">
                    {event.note}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {children && <div className="mt-5 border-t border-accent-soft pt-5">{children}</div>}
    </article>
  )
}
