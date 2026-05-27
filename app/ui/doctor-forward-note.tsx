'use client'

import Image from 'next/image'
import type { FormEvent } from 'react'
import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { createForwardNote } from '@/app/actions/referrals'
import type {
  PatientLookupResponse,
  SerializedHospital,
  SerializedReferral,
  SerializedSlot,
} from '@/app/lib/dashboard-types'
import { formatDate, formatDateTime, genderLabel } from '@/app/ui/dashboard-format'
import { IconForward } from '@/app/ui/icons'
import { AnimatePresence, motion, StaggerContainer, StaggerItem } from '@/app/ui/motion'
import { ReferralCard } from '@/app/ui/referral-card'
import { StatCard } from '@/app/ui/stat-card'

const STEPS = ['Patient Lookup', 'Select Clinic & Time', 'Write Note & Send']

export function DoctorForwardNote({
  hospitals,
  recentReferrals,
}: {
  hospitals: SerializedHospital[]
  recentReferrals: SerializedReferral[]
}) {
  const [step, setStep] = useState(0)
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
  const [state, formAction, pending] = useActionState(createForwardNote, undefined)
  const stepRef = useRef<HTMLDivElement>(null)

  const selectedHospital = useMemo(
    () => hospitals.find((h) => String(h.id) === selectedHospitalId) ?? hospitals[0],
    [hospitals, selectedHospitalId],
  )
  const clinics = useMemo(() => selectedHospital?.clinics ?? [], [selectedHospital])

  function resetAvailability() {
    setSlots([])
    setSelectedSlotId('')
    setSlotMessage(null)
  }

  const loadPatient = useCallback(async (nextUniId: string) => {
    const normalized = nextUniId.trim()
    if (!normalized) { setLookupMessage('Enter a university ID.'); return }
    setLookupLoading(true)
    setLookupMessage(null)
    try {
      const res = await fetch(`/api/patients/lookup?uniId=${encodeURIComponent(normalized)}`, { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) { setLookup(null); setLookupMessage(payload.message ?? 'Patient not found.'); return }
      setLookup(payload)
      setLookupMessage(null)
    } catch { setLookup(null); setLookupMessage('Could not load patient.') }
    finally { setLookupLoading(false) }
  }, [])

  useEffect(() => {
    if (state?.success && lookup?.patient.uniId) {
      const t = setTimeout(() => {
        void loadPatient(lookup.patient.uniId)
        setStep(0)
      }, 1500)
      return () => clearTimeout(t)
    }
  }, [loadPatient, lookup?.patient.uniId, state?.success, state?.version])

  // Animate step transitions
  useEffect(() => {
    if (stepRef.current) {
      gsap.fromTo(stepRef.current, { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' })
    }
  }, [step])

  async function handleLookup(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    await loadPatient(uniId)
  }

  async function checkAvailability() {
    if (!selectedHospital || !selectedClinicId) return
    setSlotLoading(true)
    setSlotMessage(null)
    setSelectedSlotId('')
    try {
      const res = await fetch(`/api/hospitals/${selectedHospital.id}/clinics/${selectedClinicId}/availability`, { cache: 'no-store' })
      const payload = await res.json()
      if (!res.ok) { setSlots([]); setSlotMessage(payload.message ?? 'Could not load.'); return }
      const available = (payload.slots as SerializedSlot[]).filter((s) => s.available > 0)
      setSlots(available)
      setSlotMessage(available.length ? `${available.length} times available.` : 'No available times.')
    } catch { setSlots([]); setSlotMessage('Could not load availability.') }
    finally { setSlotLoading(false) }
  }

  function goNext() { if (step < 2) setStep(step + 1) }
  function goBack() { if (step > 0) setStep(step - 1) }

  const canGoNext = step === 0 ? !!lookup : step === 1 ? !!selectedSlotId : false

  const pending_count = recentReferrals.filter((r) => r.status === 'PENDING').length
  const accepted_count = recentReferrals.filter((r) => r.status === 'ACCEPTED').length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-gradient-to-br from-accent to-accent-bright p-2.5 shadow-md shadow-accent/20">
          <IconForward className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-primary">Forward Note</h1>
          <p className="text-sm text-muted">Route patient notes to the right clinic</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Forwards" value={recentReferrals.length} />
        <StatCard label="Pending" value={pending_count} color="text-warning" />
        <StatCard label="Accepted" value={accepted_count} color="text-success" />
      </div>

      {/* Step indicator */}
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold transition-all ${
                idx === step ? 'bg-accent text-white shadow-md shadow-accent/30' :
                idx < step ? 'bg-success text-white' :
                'bg-surface-elevated text-muted border border-border'
              }`}>
                {idx < step ? '✓' : idx + 1}
              </div>
              <span className={`hidden sm:block text-sm font-medium ${idx === step ? 'text-accent' : idx < step ? 'text-success' : 'text-muted'}`}>
                {label}
              </span>
              {idx < STEPS.length - 1 && (
                <div className={`hidden sm:block h-px w-8 lg:w-16 ${idx < step ? 'bg-success' : 'bg-border'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div ref={stepRef} key={step}>
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <StepPatientLookup
                  uniId={uniId}
                  setUniId={setUniId}
                  lookup={lookup}
                  lookupMessage={lookupMessage}
                  lookupLoading={lookupLoading}
                  onSubmit={handleLookup}
                />
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <StepClinicSlot
                  hospitals={hospitals}
                  selectedHospital={selectedHospital}
                  selectedHospitalId={selectedHospitalId}
                  setSelectedHospitalId={setSelectedHospitalId}
                  clinics={clinics}
                  selectedClinicId={selectedClinicId}
                  setSelectedClinicId={setSelectedClinicId}
                  slots={slots}
                  selectedSlotId={selectedSlotId}
                  setSelectedSlotId={setSelectedSlotId}
                  slotMessage={slotMessage}
                  slotLoading={slotLoading}
                  resetAvailability={resetAvailability}
                  checkAvailability={checkAvailability}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <StepNoteAndSend
                  lookup={lookup}
                  selectedHospitalId={selectedHospitalId}
                  selectedClinicId={selectedClinicId}
                  selectedSlotId={selectedSlotId}
                  selectedHospital={selectedHospital}
                  clinics={clinics}
                  formAction={formAction}
                  state={state}
                  pending={pending}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation buttons */}
        <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted transition-all hover:border-accent hover:text-accent disabled:opacity-30 disabled:hover:border-border disabled:hover:text-muted"
          >
            ← Back
          </button>
          {step < 2 && (
            <button
              type="button"
              onClick={goNext}
              disabled={!canGoNext}
              className="rounded-lg bg-accent px-5 py-2 text-sm font-semibold text-white shadow-md shadow-accent/20 transition-all hover:bg-accent-bright disabled:opacity-40 disabled:shadow-none"
            >
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Patient existing forwards */}
      {lookup && lookup.referrals.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-primary">
            Existing forwards for {lookup.patient.fullName}
          </h2>
          <StaggerContainer className="space-y-3">
            {lookup.referrals.map((r) => (
              <StaggerItem key={r.id}>
                <ReferralCard referral={r} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}

      {/* Recent forwards */}
      {recentReferrals.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-primary">My Recent Forwards</h2>
          <StaggerContainer className="space-y-3">
            {recentReferrals.map((r) => (
              <StaggerItem key={r.id}>
                <ReferralCard referral={r} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>
      )}
    </div>
  )
}

// ─── Step 1: Patient Lookup ──────────────────────────────────────────────────

function StepPatientLookup({
  uniId,
  setUniId,
  lookup,
  lookupMessage,
  lookupLoading,
  onSubmit,
}: {
  uniId: string
  setUniId: (v: string) => void
  lookup: PatientLookupResponse | null
  lookupMessage: string | null
  lookupLoading: boolean
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-primary">Find Patient</h3>
        <p className="text-sm text-muted">Search by university ID to load patient details and history.</p>
      </div>

      <form onSubmit={onSubmit} className="flex gap-3">
        <input
          value={uniId}
          onChange={(e) => setUniId(e.target.value)}
          className="flex-1 rounded-lg border border-border bg-surface-elevated px-4 py-2.5 text-sm text-primary placeholder:text-muted outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
          placeholder="University ID (e.g. 0233949)"
        />
        <button
          type="submit"
          disabled={lookupLoading}
          className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent-bright disabled:opacity-50"
        >
          {lookupLoading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {lookupMessage && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5 text-sm text-warning"
        >
          {lookupMessage}
        </motion.p>
      )}

      {lookup && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          {/* Patient card */}
          <div className="rounded-xl border border-border bg-surface-elevated p-5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xl font-bold text-primary">{lookup.patient.fullName}</h4>
                <p className="mt-1 text-sm text-muted">@{lookup.patient.username} · {lookup.patient.uniId}</p>
              </div>
              <span className="rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
                {genderLabel(lookup.patient.gender)}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted">Date of Birth</p>
                <p className="font-medium text-primary">{formatDate(lookup.patient.dob)}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Past Visits</p>
                <p className="font-medium text-primary">{lookup.visits.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Active Forwards</p>
                <p className="font-medium text-primary">{lookup.referrals.length}</p>
              </div>
              <div>
                <p className="text-xs text-muted">Lab Results</p>
                <p className="font-medium text-primary">{lookup.labTests.length}</p>
              </div>
              {lookup.patient.faculty && (
                <div>
                  <p className="text-xs text-muted">Faculty</p>
                  <p className="font-medium text-primary">{lookup.patient.faculty}</p>
                </div>
              )}
            </div>
          </div>

          {/* Visit history */}
          {lookup.visits.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">Visit History</h4>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {lookup.visits.map((v) => (
                  <div key={v.id} className="rounded-lg border border-border-subtle bg-background p-3 transition-colors hover:border-border">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-semibold text-primary">{v.hospitalName}</p>
                        <p className="text-xs text-primary-soft">{v.clinicName} · {v.doctorName}</p>
                      </div>
                      <p className="text-xs text-muted whitespace-nowrap">{formatDate(v.visitedAt)}</p>
                    </div>
                    <p className="mt-2 text-sm font-medium text-primary">{v.summary}</p>
                    <p className="mt-1 text-xs text-muted leading-relaxed">{v.notes}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lookup.labTests.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">Lab Results</h4>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {lookup.labTests.map((test) => (
                  <div key={test.id} className="rounded-lg border border-border-subtle bg-background p-3">
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-semibold text-primary">{test.testType}</p>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">{test.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">Requested: {formatDateTime(test.requestDate)}</p>
                    <p className="mt-2 text-sm text-primary-soft">{test.result ?? 'Result pending.'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lookup.prescriptions.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider text-muted mb-3">Prescriptions</h4>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {lookup.prescriptions.map((rx) => (
                  <div key={rx.id} className="rounded-lg border border-border-subtle bg-background p-3">
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-semibold text-primary">{rx.medicationName}</p>
                      <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted">
                        {rx.isDispensed ? 'Dispensed' : 'Pending'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-primary-soft">{rx.dosage} · {rx.frequency} · {rx.duration}</p>
                    <p className="mt-1 text-xs text-muted">Prescribed: {formatDateTime(rx.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}

// ─── Step 2: Clinic & Slot Selection ─────────────────────────────────────────

function StepClinicSlot({
  hospitals,
  selectedHospital,
  selectedHospitalId,
  setSelectedHospitalId,
  clinics,
  selectedClinicId,
  setSelectedClinicId,
  slots,
  selectedSlotId,
  setSelectedSlotId,
  slotMessage,
  slotLoading,
  resetAvailability,
  checkAvailability,
}: {
  hospitals: SerializedHospital[]
  selectedHospital: SerializedHospital | undefined
  selectedHospitalId: string
  setSelectedHospitalId: (v: string) => void
  clinics: { id: number; name: string; description: string }[]
  selectedClinicId: string
  setSelectedClinicId: (v: string) => void
  slots: SerializedSlot[]
  selectedSlotId: string
  setSelectedSlotId: (v: string) => void
  slotMessage: string | null
  slotLoading: boolean
  resetAvailability: () => void
  checkAvailability: () => void
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-primary">Select Clinic & Time</h3>
        <p className="text-sm text-muted">Choose the hospital, clinic, and available time slot.</p>
      </div>

      {/* Hospital & logo */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-elevated p-4">
        {selectedHospital?.logoPath && (
          <Image src={selectedHospital.logoPath} alt={selectedHospital.name} width={48} height={48} className="rounded-lg border border-border" />
        )}
        <div className="flex-1">
          <label className="text-sm font-medium text-primary-soft">
            Hospital
            <select
              value={selectedHospitalId}
              onChange={(e) => {
                const id = e.target.value
                const h = hospitals.find((h) => String(h.id) === id)
                setSelectedHospitalId(id)
                setSelectedClinicId(h?.clinics[0] ? String(h.clinics[0].id) : '')
                resetAvailability()
              }}
              className="mt-1 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent"
            >
              {hospitals.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Clinic selection */}
      <label className="block text-sm font-medium text-primary-soft">
        Clinic
        <select
          value={selectedClinicId}
          onChange={(e) => { setSelectedClinicId(e.target.value); resetAvailability() }}
          className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent"
        >
          {clinics.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.description}</option>)}
        </select>
      </label>

      {/* Check availability */}
      <div>
        <button
          type="button"
          onClick={checkAvailability}
          disabled={!selectedClinicId || slotLoading}
          className="rounded-lg border border-accent text-accent px-5 py-2 text-sm font-semibold transition-all hover:bg-accent hover:text-white disabled:opacity-50"
        >
          {slotLoading ? 'Checking...' : 'Check Availability'}
        </button>
        {slotMessage && <p className="mt-2 text-sm text-muted">{slotMessage}</p>}
      </div>

      {/* Slot grid */}
      {slots.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        >
          {slots.map((slot) => (
            <label
              key={slot.id}
              className={`cursor-pointer rounded-lg border p-3 text-sm transition-all ${
                selectedSlotId === String(slot.id)
                  ? 'border-accent bg-accent-soft text-accent shadow-sm shadow-accent/10'
                  : 'border-border bg-surface-elevated text-primary-soft hover:border-accent/50'
              }`}
            >
              <input
                type="radio"
                name="slotPicker"
                value={slot.id}
                checked={selectedSlotId === String(slot.id)}
                onChange={() => setSelectedSlotId(String(slot.id))}
                className="sr-only"
              />
              <span className="font-semibold text-primary">{formatDateTime(slot.startsAt)}</span>
              <span className="mt-1 block text-xs text-muted">
                {slot.available} spot{slot.available === 1 ? '' : 's'} available
              </span>
            </label>
          ))}
        </motion.div>
      )}
    </div>
  )
}

// ─── Step 3: Note & Send ─────────────────────────────────────────────────────

function StepNoteAndSend({
  lookup,
  selectedHospitalId,
  selectedClinicId,
  selectedSlotId,
  selectedHospital,
  clinics,
  formAction,
  state,
  pending,
}: {
  lookup: PatientLookupResponse | null
  selectedHospitalId: string
  selectedClinicId: string
  selectedSlotId: string
  selectedHospital: SerializedHospital | undefined
  clinics: { id: number; name: string }[]
  formAction: (payload: FormData) => void
  state: { success?: boolean; message?: string; errors?: Record<string, string[] | undefined> } | undefined
  pending: boolean
}) {
  const selectedClinic = clinics.find((c) => String(c.id) === selectedClinicId)

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-primary">Write Note & Send</h3>
        <p className="text-sm text-muted">Review the details and write your clinical note.</p>
      </div>

      {/* Summary */}
      <div className="rounded-xl border border-border bg-surface-elevated p-4 space-y-2">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted">Patient</p>
            <p className="font-semibold text-primary">{lookup?.patient.fullName ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Hospital</p>
            <p className="font-semibold text-primary">{selectedHospital?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Clinic</p>
            <p className="font-semibold text-primary">{selectedClinic?.name ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-muted">Uni ID</p>
            <p className="font-semibold text-primary">{lookup?.patient.uniId ?? '—'}</p>
          </div>
        </div>
      </div>

      <input type="hidden" name="patientId" value={lookup?.patient.id ?? ''} />
      <input type="hidden" name="hospitalId" value={selectedHospitalId} />
      <input type="hidden" name="clinicId" value={selectedClinicId} />
      <input type="hidden" name="slotId" value={selectedSlotId} />

      <label className="block text-sm font-medium text-primary-soft">
        Doctor Note
        <textarea
          name="note"
          rows={6}
          required
          className="mt-1 w-full resize-y rounded-lg border border-border bg-surface-elevated px-4 py-3 text-sm text-primary placeholder:text-muted outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
          placeholder="Clinical reason, relevant history, and requested specialist review. Be specific about what you need the specialist to evaluate."
        />
      </label>

      {state?.errors?.note && <p className="text-xs text-danger">{state.errors.note[0]}</p>}

      {state?.message && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-lg border px-4 py-3 text-sm ${
            state.success ? 'border-success/20 bg-success/5 text-success' : 'border-danger/20 bg-danger/5 text-danger'
          }`}
        >
          {state.message}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={!lookup || !selectedSlotId || pending}
        className="w-full rounded-lg bg-gradient-to-r from-accent to-accent-bright px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 transition-all hover:shadow-accent/40 disabled:opacity-40 disabled:shadow-none"
      >
        {pending ? 'Sending forward note...' : 'Send Forward Note'}
      </button>
    </form>
  )
}
