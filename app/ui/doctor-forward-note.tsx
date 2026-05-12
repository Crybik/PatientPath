'use client'

import Image from 'next/image'
import type { FormEvent } from 'react'
import { useActionState, useCallback, useEffect, useMemo, useState } from 'react'
import { createForwardNote } from '@/app/actions/referrals'
import type {
  PatientLookupResponse,
  SerializedHospital,
  SerializedReferral,
  SerializedSlot,
} from '@/app/lib/dashboard-types'
import { formatDate, formatDateTime, genderLabel } from '@/app/ui/dashboard-format'
import { ReferralCard } from '@/app/ui/referral-card'

export function DoctorForwardNote({
  hospitals,
  recentReferrals,
}: {
  hospitals: SerializedHospital[]
  recentReferrals: SerializedReferral[]
}) {
  const [uniId, setUniId] = useState('')
  const [lookup, setLookup] = useState<PatientLookupResponse | null>(null)
  const [lookupMessage, setLookupMessage] = useState<string | null>(null)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [selectedHospitalId, setSelectedHospitalId] = useState(
    hospitals[0] ? String(hospitals[0].id) : '',
  )
  const [selectedClinicId, setSelectedClinicId] = useState(
    hospitals[0]?.clinics[0] ? String(hospitals[0].clinics[0].id) : '',
  )
  const [slots, setSlots] = useState<SerializedSlot[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState('')
  const [slotMessage, setSlotMessage] = useState<string | null>(null)
  const [slotLoading, setSlotLoading] = useState(false)
  const [state, formAction, pending] = useActionState(
    createForwardNote,
    undefined,
  )

  const selectedHospital = useMemo(
    () =>
      hospitals.find((hospital) => String(hospital.id) === selectedHospitalId) ??
      hospitals[0],
    [hospitals, selectedHospitalId],
  )

  const clinics = useMemo(
    () => selectedHospital?.clinics ?? [],
    [selectedHospital],
  )

  function resetAvailability() {
    setSlots([])
    setSelectedSlotId('')
    setSlotMessage(null)
  }

  const loadPatient = useCallback(
    async (nextUniId: string) => {
      const normalized = nextUniId.trim()
      if (!normalized) {
        setLookupMessage('Enter a university ID.')
        return
      }

      setLookupLoading(true)
      setLookupMessage(null)
      try {
        const response = await fetch(
          `/api/patients/lookup?uniId=${encodeURIComponent(normalized)}`,
          { cache: 'no-store' },
        )
        const payload = await response.json()
        if (!response.ok) {
          setLookup(null)
          setLookupMessage(payload.message ?? 'Patient was not found.')
          return
        }
        setLookup(payload)
        setLookupMessage(null)
      } catch {
        setLookup(null)
        setLookupMessage('Could not load patient information.')
      } finally {
        setLookupLoading(false)
      }
    },
    [],
  )

  useEffect(() => {
    if (state?.success && lookup?.patient.uniId) {
      const timer = window.setTimeout(() => {
        void loadPatient(lookup.patient.uniId)
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [loadPatient, lookup?.patient.uniId, state?.success, state?.version])

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await loadPatient(uniId)
  }

  async function checkAvailability() {
    if (!selectedHospital || !selectedClinicId) return
    setSlotLoading(true)
    setSlotMessage(null)
    setSelectedSlotId('')
    try {
      const response = await fetch(
        `/api/hospitals/${selectedHospital.id}/clinics/${selectedClinicId}/availability`,
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
    <div className="space-y-8">
      <section id="forward-note" className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Forward Note
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-primary">
            Route patient notes to the right clinic
          </h1>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border border-accent-soft bg-surface p-5 shadow-sm">
            <form onSubmit={handleLookup} className="flex flex-col gap-3 sm:flex-row">
              <div className="flex-1">
                <label
                  htmlFor="uniId"
                  className="text-sm font-semibold text-primary-soft"
                >
                  University ID
                </label>
                <input
                  id="uniId"
                  value={uniId}
                  onChange={(event) => setUniId(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-accent-soft bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                  placeholder="0233949"
                />
              </div>
              <button
                type="submit"
                disabled={lookupLoading}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-surface hover:bg-primary-soft disabled:opacity-60 sm:mt-6"
              >
                {lookupLoading ? 'Checking...' : 'Get patient'}
              </button>
            </form>
            {lookupMessage && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {lookupMessage}
              </p>
            )}

            {lookup && (
              <div className="mt-5 space-y-5">
                <div className="rounded-lg border border-accent-soft bg-background p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-xl font-semibold text-primary">
                        {lookup.patient.fullName}
                      </h2>
                      <p className="text-sm text-muted">
                        @{lookup.patient.username} - {lookup.patient.uniId}
                      </p>
                    </div>
                    <span className="rounded-full border border-accent-soft bg-surface px-3 py-1 text-xs font-semibold text-primary-soft">
                      {genderLabel(lookup.patient.gender)}
                    </span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-muted">DOB</dt>
                      <dd className="font-semibold text-primary-soft">
                        {formatDate(lookup.patient.dob)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Old visits</dt>
                      <dd className="font-semibold text-primary-soft">
                        {lookup.visits.length}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                    Visit history
                  </h3>
                  <div className="mt-3 space-y-3">
                    {lookup.visits.length === 0 ? (
                      <p className="rounded-lg border border-accent-soft bg-background p-3 text-sm text-muted">
                        No old visits are recorded for this patient.
                      </p>
                    ) : (
                      lookup.visits.map((visit) => (
                        <div
                          key={visit.id}
                          className="rounded-lg border border-accent-soft bg-background p-3"
                        >
                          <div className="flex flex-wrap justify-between gap-2">
                            <p className="font-semibold text-primary">
                              {visit.hospitalName}
                            </p>
                            <p className="text-sm text-muted">
                              {formatDate(visit.visitedAt)}
                            </p>
                          </div>
                          <p className="text-sm text-primary-soft">
                            {visit.clinicName} - {visit.doctorName}
                          </p>
                          <p className="mt-2 text-sm font-medium text-primary">
                            {visit.summary}
                          </p>
                          <p className="mt-1 text-sm text-muted">{visit.notes}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <form
            action={formAction}
            className="rounded-lg border border-accent-soft bg-surface p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-primary">
                  Jordan University Hospital
                </h2>
                <p className="text-sm text-muted">Amman specialist referral</p>
              </div>
              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-accent-soft bg-background">
                {selectedHospital?.logoPath && (
                  <Image
                    src={selectedHospital.logoPath}
                    alt={`${selectedHospital.name} logo`}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                )}
              </div>
            </div>

            <input
              type="hidden"
              name="patientId"
              value={lookup?.patient.id ?? ''}
            />
            <input type="hidden" name="hospitalId" value={selectedHospitalId} />
            <input type="hidden" name="slotId" value={selectedSlotId} />

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-primary-soft">
                Hospital
                <select
                  name="hospitalPicker"
                  value={selectedHospitalId}
                  onChange={(event) => {
                    const nextHospitalId = event.target.value
                    const nextHospital = hospitals.find(
                      (hospital) => String(hospital.id) === nextHospitalId,
                    )
                    setSelectedHospitalId(nextHospitalId)
                    setSelectedClinicId(
                      nextHospital?.clinics[0]
                        ? String(nextHospital.clinics[0].id)
                        : '',
                    )
                    resetAvailability()
                  }}
                  className="mt-1 w-full rounded-lg border border-accent-soft bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                >
                  {hospitals.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-semibold text-primary-soft">
                Clinic
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
            </div>

            <div className="mt-4">
              <button
                type="button"
                onClick={checkAvailability}
                disabled={!selectedClinicId || slotLoading}
                className="rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-accent-soft/35 disabled:opacity-60"
              >
                {slotLoading ? 'Checking...' : 'Check availability'}
              </button>
              {slotMessage && <p className="mt-2 text-sm text-muted">{slotMessage}</p>}
            </div>

            {slots.length > 0 && (
              <fieldset className="mt-4">
                <legend className="text-sm font-semibold text-primary-soft">
                  Available times
                </legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {slots.map((slot) => (
                    <label
                      key={slot.id}
                      className="cursor-pointer rounded-lg border border-accent-soft bg-background p-3 text-sm text-primary-soft has-[:checked]:border-accent has-[:checked]:bg-accent-soft/30"
                    >
                      <input
                        type="radio"
                        name="slotPicker"
                        value={slot.id}
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
              </fieldset>
            )}

            <label className="mt-5 block text-sm font-semibold text-primary-soft">
              Doctor note
              <textarea
                name="note"
                rows={7}
                required
                className="mt-1 w-full resize-y rounded-lg border border-accent-soft bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
                placeholder="Clinical reason, relevant history, and requested specialist review."
              />
            </label>

            {state?.errors?.note && (
              <p className="mt-2 text-sm text-red-700">{state.errors.note[0]}</p>
            )}
            {state?.message && (
              <p
                className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
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
              disabled={!lookup || !selectedSlotId || pending}
              className="mt-5 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-surface hover:bg-primary-soft disabled:opacity-60"
            >
              {pending ? 'Sending...' : 'Forward note'}
            </button>
          </form>
        </div>
      </section>

      {lookup && lookup.referrals.length > 0 && (
        <section id="patient-forwards" className="space-y-4">
          <h2 className="text-xl font-semibold text-primary">
            Existing forwards for {lookup.patient.fullName}
          </h2>
          <div className="space-y-4">
            {lookup.referrals.map((referral) => (
              <ReferralCard key={referral.id} referral={referral} />
            ))}
          </div>
        </section>
      )}

      <section id="doctor-history" className="space-y-4">
        <h2 className="text-xl font-semibold text-primary">Recent forwards</h2>
        {recentReferrals.length === 0 ? (
          <p className="rounded-lg border border-accent-soft bg-surface p-4 text-sm text-muted">
            No forwards have been created by this doctor yet.
          </p>
        ) : (
          <div className="space-y-4">
            {recentReferrals.map((referral) => (
              <ReferralCard key={referral.id} referral={referral} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
