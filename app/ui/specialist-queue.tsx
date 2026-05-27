'use client'

import { useActionState, useCallback, useEffect, useMemo, useState } from 'react'
import {
  addReferralFeedback,
  acceptForward,
  completeReferral,
  forwardToAnotherClinic,
  requestAdditionalInformation,
  rejectForward,
  updateReferralStatus,
} from '@/app/actions/referrals'
import type { SerializedHospital, SerializedReferral, SerializedSlot } from '@/app/lib/dashboard-types'
import { formatDateTime } from '@/app/ui/dashboard-format'
import { IconCheck, IconClipboard, IconForward, IconSearch, IconX } from '@/app/ui/icons'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/app/ui/motion'
import { ReferralCard } from '@/app/ui/referral-card'
import { ReferralClinicalActions } from '@/app/ui/referral-clinical-actions'
import { StatCard } from '@/app/ui/stat-card'

export function SpecialistQueue({
  initialReferrals,
  hospitals,
}: {
  initialReferrals: SerializedReferral[]
  hospitals: SerializedHospital[]
}) {
  const [referrals, setReferrals] = useState(initialReferrals)
  const [message, setMessage] = useState<string | null>(null)
  const [filter, setFilter] = useState<string>('ALL')
  const [search, setSearch] = useState('')

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/forwards', { cache: 'no-store' })
      const payload = await res.json()
      if (res.ok) { setReferrals(payload.referrals ?? []); setMessage(null) }
    } catch { setMessage('Could not refresh.') }
  }, [])

  useEffect(() => {
    const t = setInterval(() => void refresh(), 5000)
    return () => clearInterval(t)
  }, [refresh])

  const filtered = referrals.filter((referral) => {
    const statusMatches = filter === 'ALL' || referral.status === filter
    const normalized = search.trim().toLowerCase()
    if (!statusMatches) return false
    if (!normalized) return true
    return [
      referral.patient.fullName,
      referral.patient.uniId,
      referral.status,
      referral.hospital.name,
      referral.clinic.name,
      referral.createdAt.slice(0, 10),
      referral.scheduledAt?.slice(0, 10) ?? '',
    ].join(' ').toLowerCase().includes(normalized)
  })
  const pending = referrals.filter((r) => r.status === 'PENDING').length
  const accepted = referrals.filter((r) => r.status === 'ACCEPTED').length
  const completed = referrals.filter((r) => r.status === 'COMPLETED').length

  const filters = ['ALL', 'PENDING', 'ACCEPTED', 'SCHEDULED', 'FORWARDED', 'REJECTED', 'IN_PROGRESS', 'COMPLETED']

  return (
    <div className="space-y-6">
      <FadeInUp>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 p-2.5 shadow-md shadow-orange-500/20">
            <IconClipboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Specialist Queue</h1>
            <p className="text-sm text-muted">Manage incoming referrals</p>
          </div>
        </div>
      </FadeInUp>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Total" value={referrals.length} />
        <StatCard label="Pending" value={pending} color="text-amber-400" />
        <StatCard label="Accepted" value={accepted} color="text-emerald-400" />
        <StatCard label="Completed" value={completed} color="text-blue-400" />
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
                  ? 'bg-accent text-white'
                  : 'border border-border text-muted hover:border-accent/50 hover:text-primary'
              }`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {message && (
        <p className="rounded-lg border border-warning/20 bg-warning/5 px-3 py-2 text-sm text-warning">{message}</p>
      )}

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No referrals match this filter.
        </p>
      ) : (
        <StaggerContainer className="space-y-4">
          {filtered.map((referral) => (
            <StaggerItem key={referral.id}>
              <ReferralCard referral={referral}>
                <div className="space-y-4">
                  <div className="grid gap-4 xl:grid-cols-3">
                    {referral.status === 'PENDING' && (
                      <>
                        <AcceptForm referralId={referral.id} onChanged={refresh} />
                        <RejectForm referralId={referral.id} onChanged={refresh} />
                      </>
                    )}
                    {(['ACCEPTED', 'SCHEDULED', 'FORWARDED', 'IN_PROGRESS'].includes(referral.status)) && (
                      <CompleteForm referralId={referral.id} onChanged={refresh} />
                    )}
                    <StatusUpdateForm referralId={referral.id} currentStatus={referral.status} onChanged={refresh} />
                    <RequestInfoForm referralId={referral.id} onChanged={refresh} />
                    {referral.status === 'COMPLETED' && (
                      <FeedbackForm referralId={referral.id} onChanged={refresh} />
                    )}
                    <ForwardAgainForm referral={referral} hospitals={hospitals} onChanged={refresh} />
                  </div>
                  <ReferralClinicalActions referral={referral} />
                </div>
              </ReferralCard>
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  )
}

function AcceptForm({ referralId, onChanged }: { referralId: number; onChanged: () => Promise<void> }) {
  const [state, formAction, pending] = useActionState(acceptForward, undefined)
  useEffect(() => { if (state?.success) void onChanged() }, [onChanged, state?.success, state?.version])

  return (
    <form action={formAction} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
      <input type="hidden" name="referralId" value={referralId} />
      <label className="block text-xs font-semibold text-emerald-700">
        <IconCheck className="inline w-4 h-4 mr-1" />Accept
        <textarea name="note" rows={2} required placeholder="Acceptance note..." className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
      </label>
      {state?.message && <p className={`mt-1 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="mt-2 w-full rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
        {pending ? 'Accepting...' : 'Accept'}
      </button>
    </form>
  )
}

function RejectForm({ referralId, onChanged }: { referralId: number; onChanged: () => Promise<void> }) {
  const [state, formAction, pending] = useActionState(rejectForward, undefined)
  useEffect(() => { if (state?.success) void onChanged() }, [onChanged, state?.success, state?.version])

  return (
    <form action={formAction} className="rounded-lg border border-red-200 bg-red-50/50 p-3">
      <input type="hidden" name="referralId" value={referralId} />
      <label className="block text-xs font-semibold text-red-700">
        <IconX className="inline w-4 h-4 mr-1" />Reject
        <textarea name="reason" rows={2} required placeholder="Rejection reason..." className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
      </label>
      {state?.message && <p className={`mt-1 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="mt-2 w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
        {pending ? 'Rejecting...' : 'Reject'}
      </button>
    </form>
  )
}

function CompleteForm({ referralId, onChanged }: { referralId: number; onChanged: () => Promise<void> }) {
  const [state, formAction, pending] = useActionState(completeReferral, undefined)
  useEffect(() => { if (state?.success) void onChanged() }, [onChanged, state?.success, state?.version])

  return (
    <form action={formAction} className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
      <input type="hidden" name="referralId" value={referralId} />
      <label className="block text-xs font-semibold text-blue-700">
        Mark Complete
        <textarea name="note" rows={2} required placeholder="Completion note..." className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
      </label>
      {state?.message && <p className={`mt-1 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
        {pending ? 'Completing...' : 'Complete'}
      </button>
    </form>
  )
}

function StatusUpdateForm({
  referralId,
  currentStatus,
  onChanged,
}: {
  referralId: number
  currentStatus: string
  onChanged: () => Promise<void>
}) {
  const [state, formAction, pending] = useActionState(updateReferralStatus, undefined)
  useEffect(() => { if (state?.success) void onChanged() }, [onChanged, state?.success, state?.version])

  return (
    <form action={formAction} className="rounded-lg border border-cyan-200 bg-cyan-50/50 p-3">
      <input type="hidden" name="referralId" value={referralId} />
      <label className="block text-xs font-semibold text-cyan-700">
        Update Status
        <select name="status" defaultValue={currentStatus} className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent">
          {['PENDING', 'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map((status) => (
            <option key={status} value={status}>{status.replace('_', ' ')}</option>
          ))}
        </select>
      </label>
      <textarea name="note" rows={2} required placeholder="Status note..." className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
      {state?.message && <p className={`mt-1 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="mt-2 w-full rounded-lg bg-cyan-600 px-3 py-2 text-xs font-semibold text-white hover:bg-cyan-700 disabled:opacity-50">
        {pending ? 'Updating...' : 'Update Status'}
      </button>
    </form>
  )
}

function RequestInfoForm({ referralId, onChanged }: { referralId: number; onChanged: () => Promise<void> }) {
  const [state, formAction, pending] = useActionState(requestAdditionalInformation, undefined)
  useEffect(() => { if (state?.success) void onChanged() }, [onChanged, state?.success, state?.version])

  return (
    <form action={formAction} className="rounded-lg border border-yellow-200 bg-yellow-50/50 p-3">
      <input type="hidden" name="referralId" value={referralId} />
      <label className="block text-xs font-semibold text-yellow-700">
        Request More Info
        <textarea name="note" rows={2} required placeholder="What information is needed?" className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
      </label>
      {state?.message && <p className={`mt-1 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="mt-2 w-full rounded-lg bg-yellow-600 px-3 py-2 text-xs font-semibold text-white hover:bg-yellow-700 disabled:opacity-50">
        {pending ? 'Sending...' : 'Request Info'}
      </button>
    </form>
  )
}

function FeedbackForm({ referralId, onChanged }: { referralId: number; onChanged: () => Promise<void> }) {
  const [state, formAction, pending] = useActionState(addReferralFeedback, undefined)
  useEffect(() => { if (state?.success) void onChanged() }, [onChanged, state?.success, state?.version])

  return (
    <form action={formAction} className="rounded-lg border border-teal-200 bg-teal-50/50 p-3">
      <input type="hidden" name="referralId" value={referralId} />
      <label className="block text-xs font-semibold text-teal-700">
        Completion Feedback
        <textarea name="feedback" rows={2} required placeholder="Medical summary or post-referral feedback..." className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
      </label>
      {state?.message && <p className={`mt-1 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="mt-2 w-full rounded-lg bg-teal-600 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
        {pending ? 'Saving...' : 'Add Feedback'}
      </button>
    </form>
  )
}

function ForwardAgainForm({ referral, hospitals, onChanged }: { referral: SerializedReferral; hospitals: SerializedHospital[]; onChanged: () => Promise<void> }) {
  const [selectedClinicId, setSelectedClinicId] = useState(String(referral.clinic.id))
  const [slots, setSlots] = useState<SerializedSlot[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [slotMessage, setSlotMessage] = useState<string | null>(null)
  const [slotLoading, setSlotLoading] = useState(false)
  const [state, formAction, pending] = useActionState(forwardToAnotherClinic, undefined)

  const hospital = useMemo(() => hospitals.find((h) => h.id === referral.hospital.id), [hospitals, referral.hospital.id])
  const clinics = hospital?.clinics ?? []

  useEffect(() => { if (state?.success) void onChanged() }, [onChanged, state?.success, state?.version])

  async function checkAvailability() {
    if (!hospital || !selectedClinicId) return
    setSlotLoading(true); setSelectedSlotId(''); setSlotMessage(null)
    try {
      const res = await fetch(`/api/hospitals/${hospital.id}/clinics/${selectedClinicId}/availability`, { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) { setSlots([]); setSlotMessage(payload.message ?? 'Error'); return }
      const available = (payload.slots as SerializedSlot[]).filter((s) => s.available > 0)
      setSlots(available)
      setSlotMessage(available.length ? `${available.length} available` : 'None available')
    } catch { setSlots([]); setSlotMessage('Error') }
    finally { setSlotLoading(false) }
  }

  return (
    <form action={formAction} className="rounded-lg border border-border bg-surface-elevated p-3">
      <input type="hidden" name="referralId" value={referral.id} />
      <input type="hidden" name="slotId" value={selectedSlotId} />
      <p className="text-xs font-semibold text-accent"><IconForward className="inline w-4 h-4 mr-1" />Forward Again</p>

      <select
        name="clinicId"
        value={selectedClinicId}
        onChange={(e) => { setSelectedClinicId(e.target.value); setSlots([]); setSelectedSlotId('') }}
        className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent"
      >
        {clinics.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <button type="button" onClick={checkAvailability} disabled={slotLoading} className="mt-2 rounded-lg border border-border px-3 py-1.5 text-xs text-muted hover:text-primary disabled:opacity-50">
        {slotLoading ? '...' : 'Check slots'}
      </button>
      {slotMessage && <p className="mt-1 text-xs text-muted">{slotMessage}</p>}

      {slots.length > 0 && (
        <div className="mt-2 grid gap-1">
          {slots.slice(0, 4).map((slot) => (
            <label key={slot.id} className={`cursor-pointer rounded-lg border p-2 text-xs ${selectedSlotId === String(slot.id) ? 'border-accent bg-accent-soft' : 'border-border'}`}>
              <input type="radio" name="slotPicker" checked={selectedSlotId === String(slot.id)} onChange={() => setSelectedSlotId(String(slot.id))} className="sr-only" />
              {formatDateTime(slot.startsAt)} ({slot.available} open)
            </label>
          ))}
        </div>
      )}

      <textarea name="note" rows={2} required placeholder="Routing note..." className="mt-2 w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
      {state?.message && <p className={`mt-1 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      <button type="submit" disabled={!selectedSlotId || pending} className="mt-2 w-full rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">
        {pending ? 'Forwarding...' : 'Forward'}
      </button>
    </form>
  )
}
