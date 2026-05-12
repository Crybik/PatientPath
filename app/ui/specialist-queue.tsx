'use client'

import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  acceptForward,
  forwardToAnotherClinic,
} from '@/app/actions/referrals'
import type {
  SerializedHospital,
  SerializedReferral,
  SerializedSlot,
} from '@/app/lib/dashboard-types'
import { formatDateTime } from '@/app/ui/dashboard-format'
import { ReferralCard } from '@/app/ui/referral-card'

export function SpecialistQueue({
  initialReferrals,
  hospitals,
}: {
  initialReferrals: SerializedReferral[]
  hospitals: SerializedHospital[]
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
      setMessage('Could not refresh specialist queue.')
    }
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      void refresh()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [refresh])

  return (
    <section id="specialist-queue" className="space-y-5">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-accent">
          Specialist Queue
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-primary">
          Hospital forwards
        </h1>
      </div>

      {message && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {message}
        </p>
      )}

      {referrals.length === 0 ? (
        <p className="rounded-lg border border-accent-soft bg-surface p-4 text-sm text-muted">
          No forwards are waiting for this hospital.
        </p>
      ) : (
        <div className="space-y-4">
          {referrals.map((referral) => (
            <ReferralCard key={referral.id} referral={referral}>
              <div className="grid gap-5 xl:grid-cols-2">
                {referral.status === 'PENDING' && (
                  <AcceptForwardForm referralId={referral.id} onChanged={refresh} />
                )}
                <ForwardAgainForm
                  referral={referral}
                  hospitals={hospitals}
                  onChanged={refresh}
                />
              </div>
            </ReferralCard>
          ))}
        </div>
      )}
    </section>
  )
}

function AcceptForwardForm({
  referralId,
  onChanged,
}: {
  referralId: number
  onChanged: () => Promise<void>
}) {
  const [state, formAction, pending] = useActionState(acceptForward, undefined)

  useEffect(() => {
    if (state?.success) {
      void onChanged()
    }
  }, [onChanged, state?.success, state?.version])

  return (
    <form action={formAction} className="rounded-lg border border-accent-soft bg-background p-4">
      <input type="hidden" name="referralId" value={referralId} />
      <label className="block text-sm font-semibold text-primary-soft">
        Accept note
        <textarea
          name="note"
          rows={4}
          required
          className="mt-1 w-full resize-y rounded-lg border border-accent-soft bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          placeholder="Specialist acceptance note."
        />
      </label>
      {state?.message && (
        <p
          className={`mt-2 rounded-lg border px-3 py-2 text-sm ${
            state.success
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary-soft disabled:opacity-60"
      >
        {pending ? 'Accepting...' : 'Accept forward'}
      </button>
    </form>
  )
}

function ForwardAgainForm({
  referral,
  hospitals,
  onChanged,
}: {
  referral: SerializedReferral
  hospitals: SerializedHospital[]
  onChanged: () => Promise<void>
}) {
  const [selectedClinicId, setSelectedClinicId] = useState(String(referral.clinic.id))
  const [slots, setSlots] = useState<SerializedSlot[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [slotMessage, setSlotMessage] = useState<string | null>(null)
  const [slotLoading, setSlotLoading] = useState(false)
  const [state, formAction, pending] = useActionState(
    forwardToAnotherClinic,
    undefined,
  )

  const hospital = useMemo(
    () => hospitals.find((item) => item.id === referral.hospital.id),
    [hospitals, referral.hospital.id],
  )
  const clinics = hospital?.clinics ?? []

  function resetAvailability() {
    setSlots([])
    setSelectedSlotId('')
    setSlotMessage(null)
  }

  useEffect(() => {
    if (state?.success) {
      void onChanged()
    }
  }, [onChanged, state?.success, state?.version])

  async function checkAvailability() {
    if (!hospital || !selectedClinicId) return
    setSlotLoading(true)
    setSelectedSlotId('')
    setSlotMessage(null)
    try {
      const response = await fetch(
        `/api/hospitals/${hospital.id}/clinics/${selectedClinicId}/availability`,
        { cache: 'no-store' },
      )
      const payload = await response.json()
      if (!response.ok) {
        setSlots([])
        setSlotMessage(payload.message ?? 'Could not load availability.')
        return
      }
      const availableSlots = (payload.slots as SerializedSlot[]).filter(
        (slot) => slot.available > 0,
      )
      setSlots(availableSlots)
      setSlotMessage(
        availableSlots.length
          ? `${availableSlots.length} available times found.`
          : 'No available times for this clinic.',
      )
    } catch {
      setSlots([])
      setSlotMessage('Could not load availability.')
    } finally {
      setSlotLoading(false)
    }
  }

  return (
    <form action={formAction} className="rounded-lg border border-accent-soft bg-background p-4">
      <input type="hidden" name="referralId" value={referral.id} />
      <input type="hidden" name="slotId" value={selectedSlotId} />

      <label className="block text-sm font-semibold text-primary-soft">
        Route to clinic
        <select
          name="clinicId"
          value={selectedClinicId}
          onChange={(event) => {
            setSelectedClinicId(event.target.value)
            resetAvailability()
          }}
          className="mt-1 w-full rounded-lg border border-accent-soft bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        >
          {clinics.map((clinic) => (
            <option key={clinic.id} value={clinic.id}>
              {clinic.name}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={checkAvailability}
        disabled={slotLoading || !selectedClinicId}
        className="mt-3 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-accent-soft/35 disabled:opacity-60"
      >
        {slotLoading ? 'Checking...' : 'Check availability'}
      </button>
      {slotMessage && <p className="mt-2 text-sm text-muted">{slotMessage}</p>}

      {slots.length > 0 && (
        <div className="mt-3 grid gap-2">
          {slots.map((slot) => (
            <label
              key={slot.id}
              className="cursor-pointer rounded-lg border border-accent-soft bg-surface p-3 text-sm text-primary-soft has-[:checked]:border-accent has-[:checked]:bg-accent-soft/30"
            >
              <input
                type="radio"
                name="slotPicker"
                checked={selectedSlotId === String(slot.id)}
                onChange={() => setSelectedSlotId(String(slot.id))}
                className="sr-only"
              />
              <span className="font-semibold text-primary">
                {formatDateTime(slot.startsAt)}
              </span>
              <span className="mt-1 block text-xs text-muted">
                {slot.available} spot{slot.available === 1 ? '' : 's'} open
              </span>
            </label>
          ))}
        </div>
      )}

      <label className="mt-3 block text-sm font-semibold text-primary-soft">
        Routing note
        <textarea
          name="note"
          rows={4}
          required
          className="mt-1 w-full resize-y rounded-lg border border-accent-soft bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          placeholder="Reason for forwarding to this clinic and selected time."
        />
      </label>

      {state?.message && (
        <p
          className={`mt-2 rounded-lg border px-3 py-2 text-sm ${
            state.success
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={!selectedSlotId || pending}
        className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary-soft disabled:opacity-60"
      >
        {pending ? 'Forwarding...' : 'Forward again'}
      </button>
    </form>
  )
}
