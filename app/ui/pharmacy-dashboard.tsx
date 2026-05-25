'use client'

import { useActionState, useCallback, useEffect, useState } from 'react'
import { dispensePrescription } from '@/app/actions/prescriptions'
import type { SerializedPrescription } from '@/app/lib/dashboard-types'
import { formatDateTime } from '@/app/ui/dashboard-format'
import { IconPill } from '@/app/ui/icons'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/app/ui/motion'
import { StatCard } from '@/app/ui/stat-card'

export function PharmacyDashboard({ initialPrescriptions }: { initialPrescriptions: SerializedPrescription[] }) {
  const [prescriptions, setPrescriptions] = useState(initialPrescriptions)
  const [filter, setFilter] = useState<string>('ALL')

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/prescriptions', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setPrescriptions(data.prescriptions ?? [])
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    const t = setInterval(() => void refresh(), 8000)
    return () => clearInterval(t)
  }, [refresh])

  const pending = prescriptions.filter((p) => !p.isDispensed).length
  const dispensed = prescriptions.filter((p) => p.isDispensed).length
  const filtered = filter === 'ALL' ? prescriptions :
    filter === 'PENDING' ? prescriptions.filter((p) => !p.isDispensed) :
    prescriptions.filter((p) => p.isDispensed)

  return (
    <div className="space-y-6">
      <FadeInUp>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 p-2.5">
            <IconPill className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Pharmacy</h1>
            <p className="text-sm text-muted">Manage and dispense prescriptions</p>
          </div>
        </div>
      </FadeInUp>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total" value={prescriptions.length} />
        <StatCard label="Pending" value={pending} color="text-amber-400" />
        <StatCard label="Dispensed" value={dispensed} color="text-emerald-400" />
      </div>

      <div className="flex gap-2">
        {['ALL', 'PENDING', 'DISPENSED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f ? 'bg-accent text-white' : 'border border-border text-muted hover:text-primary'
            }`}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No prescriptions match this filter.
        </p>
      ) : (
        <StaggerContainer className="space-y-3">
          {filtered.map((rx) => (
            <StaggerItem key={rx.id}>
              <PrescriptionCard rx={rx} onDispensed={refresh} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  )
}

function PrescriptionCard({ rx, onDispensed }: { rx: SerializedPrescription; onDispensed: () => Promise<void> }) {
  const [state, formAction, pending] = useActionState(dispensePrescription, undefined)

  useEffect(() => { if (state?.success) void onDispensed() }, [onDispensed, state?.success])

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-primary">{rx.medicationName}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              rx.isDispensed ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
            }`}>
              {rx.isDispensed ? 'Dispensed' : 'Pending'}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Patient: {rx.patientName} ({rx.patientUniId})
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-3 rounded-lg bg-surface-elevated p-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted">Dosage</p>
          <p className="text-sm text-primary-soft">{rx.dosage}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted">Frequency</p>
          <p className="text-sm text-primary-soft">{rx.frequency}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-muted">Duration</p>
          <p className="text-sm text-primary-soft">{rx.duration}</p>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">
        Prescribed by: {rx.requestedByName} · {formatDateTime(rx.createdAt)}
      </p>

      {rx.isDispensed && rx.pharmacyStaffName && (
        <p className="mt-1 text-xs text-success">
          Dispensed by: {rx.pharmacyStaffName} · {formatDateTime(rx.dispensedDate)}
        </p>
      )}

      {!rx.isDispensed && (
        <form action={formAction} className="mt-3 border-t border-border pt-3">
          <input type="hidden" name="prescriptionId" value={rx.id} />
          {state?.message && <p className={`mb-2 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
          <button type="submit" disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {pending ? 'Dispensing...' : 'Mark as Dispensed'}
          </button>
        </form>
      )}
    </div>
  )
}
