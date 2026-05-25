'use client'

import { useActionState, useCallback, useEffect, useState } from 'react'
import { processLabTest } from '@/app/actions/lab-tests'
import type { SerializedLabTest } from '@/app/lib/dashboard-types'
import { formatDateTime } from '@/app/ui/dashboard-format'
import { IconFlask } from '@/app/ui/icons'
import { FadeInUp, StaggerContainer, StaggerItem } from '@/app/ui/motion'
import { StatCard } from '@/app/ui/stat-card'

export function LabDashboard({ initialTests }: { initialTests: SerializedLabTest[] }) {
  const [tests, setTests] = useState(initialTests)
  const [filter, setFilter] = useState<string>('ALL')

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/lab-tests', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        setTests(data.labTests ?? [])
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => {
    const t = setInterval(() => void refresh(), 8000)
    return () => clearInterval(t)
  }, [refresh])

  const pending = tests.filter((t) => t.status === 'PENDING').length
  const completed = tests.filter((t) => t.status === 'COMPLETED').length
  const filtered = filter === 'ALL' ? tests : tests.filter((t) => t.status === filter)

  return (
    <div className="space-y-6">
      <FadeInUp>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 p-2.5">
            <IconFlask className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Lab Tests</h1>
            <p className="text-sm text-muted">Process and manage lab test requests</p>
          </div>
        </div>
      </FadeInUp>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Tests" value={tests.length} />
        <StatCard label="Pending" value={pending} color="text-amber-400" />
        <StatCard label="Completed" value={completed} color="text-emerald-400" />
      </div>

      <div className="flex gap-2">
        {['ALL', 'PENDING', 'COMPLETED'].map((f) => (
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
          No lab tests match this filter.
        </p>
      ) : (
        <StaggerContainer className="space-y-3">
          {filtered.map((test) => (
            <StaggerItem key={test.id}>
              <LabTestCard test={test} onProcessed={refresh} />
            </StaggerItem>
          ))}
        </StaggerContainer>
      )}
    </div>
  )
}

function LabTestCard({ test, onProcessed }: { test: SerializedLabTest; onProcessed: () => Promise<void> }) {
  const [state, formAction, pending] = useActionState(processLabTest, undefined)

  useEffect(() => { if (state?.success) void onProcessed() }, [onProcessed, state?.success])

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-primary">{test.testType}</h3>
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
              test.status === 'PENDING' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}>
              {test.status}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">
            Patient: {test.patientName} ({test.patientUniId}) · Requested by: {test.requestedByName}
          </p>
          <p className="text-xs text-muted">Requested: {formatDateTime(test.requestDate)}</p>
        </div>
      </div>

      {test.result && (
        <div className="mt-3 rounded-lg bg-surface-elevated p-3">
          <p className="text-xs font-semibold text-muted">Result</p>
          <p className="mt-1 text-sm text-primary-soft">{test.result}</p>
          {test.labStaffName && <p className="mt-1 text-xs text-muted">Processed by: {test.labStaffName}</p>}
        </div>
      )}

      {test.status === 'PENDING' && (
        <form action={formAction} className="mt-3 border-t border-border pt-3">
          <input type="hidden" name="labTestId" value={test.id} />
          <textarea
            name="result"
            rows={2}
            required
            placeholder="Enter test results..."
            className="w-full resize-none rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent"
          />
          {state?.message && <p className={`mt-1 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
          <button type="submit" disabled={pending} className="mt-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
            {pending ? 'Processing...' : 'Submit Result'}
          </button>
        </form>
      )}
    </div>
  )
}
