'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { SerializedReferral } from '@/app/lib/dashboard-types'
import { formatDateTime, statusColor, statusLabel } from '@/app/ui/dashboard-format'
import { AnimatePresence, motion } from '@/app/ui/motion'

function fileSizeLabel(size: number | null) {
  if (!size) return 'Unknown size'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function eventTitle(type: string) {
  const labels: Record<string, string> = {
    CREATED: 'Forward created',
    ACCEPTED: 'Accepted by specialist',
    SCHEDULED: 'Scheduled',
    FORWARDED: 'Forwarded to another clinic',
    REJECTED: 'Rejected',
    IN_PROGRESS: 'Marked in progress',
    COMPLETED: 'Completed',
    STATUS_UPDATED: 'Status updated',
    INFORMATION_REQUESTED: 'Additional information requested',
    FEEDBACK_ADDED: 'Feedback added',
    ATTACHMENT_ADDED: 'Attachment added',
  }
  return labels[type] ?? type
}

export function ReferralCard({
  referral,
  children,
}: {
  referral: SerializedReferral
  children?: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden transition-all hover:shadow-md"
    >
      <div className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-elevated">
              {referral.hospital.logoPath ? (
                <Image src={referral.hospital.logoPath} alt={referral.hospital.name} fill sizes="40px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-xs font-bold text-accent">
                  {referral.hospital.shortName}
                </div>
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-primary">
                  {referral.patient.fullName}
                </h3>
                <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusColor(referral.status)}`}>
                  {statusLabel(referral.status)}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted">
                {referral.hospital.name} → {referral.clinic.name}
              </p>
              {referral.scheduledAt && (
                <p className="mt-1 text-xs text-primary-soft">
                  Scheduled: {formatDateTime(referral.scheduledAt)}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="self-start rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted transition-all hover:bg-surface-elevated hover:text-primary hover:border-accent/30"
          >
            {expanded ? 'Collapse' : 'Details'}
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="overflow-hidden"
            >
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-lg bg-surface-elevated p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Doctor note</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-primary-soft leading-relaxed">
                    {referral.doctorNote}
                  </p>
                  <p className="mt-2 text-xs text-muted">By {referral.doctorName}</p>
                </div>
                <div className="rounded-lg bg-surface-elevated p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Specialist note</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-primary-soft leading-relaxed">
                    {referral.specialistNote ?? 'No specialist note yet.'}
                  </p>
                  {referral.specialistName && (
                    <p className="mt-2 text-xs text-muted">By {referral.specialistName}</p>
                  )}
                </div>
              </div>

              {referral.feedback && (
                <div className="mt-4 rounded-lg border border-success/20 bg-success/5 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-success">Referral feedback</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-primary-soft">{referral.feedback}</p>
                </div>
              )}

              {referral.rejectionReason && (
                <div className="mt-4 rounded-lg border border-danger/20 bg-danger/5 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-danger">Rejection reason</p>
                  <p className="mt-1 text-sm text-primary-soft">{referral.rejectionReason}</p>
                </div>
              )}

              {referral.attachments.length > 0 && (
                <div className="mt-5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Attachments</p>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {referral.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.downloadUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-border bg-surface-elevated p-3 text-sm transition-all hover:border-accent/40 hover:text-accent"
                      >
                        <span className="block font-semibold text-primary">{attachment.fileName}</span>
                        <span className="mt-1 block text-xs text-muted">
                          {attachment.fileType} · {fileSizeLabel(attachment.fileSize)}
                        </span>
                        {attachment.uploadedByName && (
                          <span className="mt-1 block text-xs text-muted">Uploaded by {attachment.uploadedByName}</span>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Timeline */}
              <div className="mt-5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Timeline</p>
                <div className="mt-3 space-y-3">
                  {referral.events.map((event, idx) => (
                    <div key={event.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`h-2.5 w-2.5 rounded-full ${
                          event.type === 'REJECTED' ? 'bg-danger' :
                          event.type === 'COMPLETED' ? 'bg-success' :
                          'bg-accent'
                        }`} />
                        {idx < referral.events.length - 1 && (
                          <div className="mt-1 w-px flex-1 bg-border" />
                        )}
                      </div>
                      <div className="pb-3">
                        <p className="text-sm font-medium text-primary">{eventTitle(event.type)}</p>
                        <p className="text-xs text-muted">
                          {event.actorName} · {formatDateTime(event.createdAt)}
                        </p>
                        {event.toClinicName && (
                          <p className="mt-1 text-xs text-primary-soft">
                            {event.fromClinicName ? `${event.fromClinicName} → ` : ''}
                            {event.toClinicName}
                          </p>
                        )}
                        {event.note && (
                          <p className="mt-1 text-sm text-muted">{event.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {children && (
        <div className="border-t border-border bg-surface-elevated/50 p-5">
          {children}
        </div>
      )}
    </motion.article>
  )
}
