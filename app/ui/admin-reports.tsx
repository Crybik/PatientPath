'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { createAdminReportSnapshot } from '@/app/actions/reports'
import type { SerializedClinic } from '@/app/lib/dashboard-types'
import type { AdminReportData } from '@/app/lib/reports'
import { formatDateTime } from '@/app/ui/dashboard-format'
import { IconChart } from '@/app/ui/icons'
import { FadeInUp } from '@/app/ui/motion'
import { StatCard } from '@/app/ui/stat-card'

type Snapshot = {
  id: number
  reportType: string
  createdAt: string
  generatedBy: string
}

export function AdminReports({
  report,
  clinics,
  snapshots,
}: {
  report: AdminReportData
  clinics: SerializedClinic[]
  snapshots: Snapshot[]
}) {
  const [state, formAction, pending] = useActionState(createAdminReportSnapshot, undefined)
  const params = new URLSearchParams()
  if (report.filters.startDate) params.set('startDate', report.filters.startDate)
  if (report.filters.endDate) params.set('endDate', report.filters.endDate)
  if (report.filters.clinicId) params.set('clinicId', String(report.filters.clinicId))

  return (
    <div className="space-y-8">
      <FadeInUp>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-gradient-to-br from-primary to-primary-soft p-2.5 shadow-lg shadow-primary/10">
            <IconChart className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">Reports</h1>
            <p className="text-sm text-muted">Referral counts, completion, processing time, and department activity</p>
          </div>
        </div>
      </FadeInUp>

      <form action="/dashboard/reports" className="grid gap-3 rounded-xl border border-border bg-surface p-4 shadow-sm md:grid-cols-4">
        <label className="text-sm font-medium text-primary-soft">
          Start date
          <input name="startDate" type="date" defaultValue={report.filters.startDate ?? ''} className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
        </label>
        <label className="text-sm font-medium text-primary-soft">
          End date
          <input name="endDate" type="date" defaultValue={report.filters.endDate ?? ''} className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
        </label>
        <label className="text-sm font-medium text-primary-soft">
          Department
          <select name="clinicId" defaultValue={report.filters.clinicId ?? ''} className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent">
            <option value="">All departments</option>
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <button className="w-full rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-bright">
            Apply
          </button>
        </div>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Referrals" value={report.totalReferrals} />
        <StatCard label="Completed" value={report.completedReferrals} color="text-success" />
        <StatCard label="Completion Rate" value={`${Math.round(report.completionRate * 100)}%`} color="text-accent" />
        <StatCard label="Avg Processing" value={report.averageProcessingHours === null ? 'N/A' : `${report.averageProcessingHours.toFixed(1)}h`} color="text-warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-primary">Referral Counts by Status</h2>
          <div className="mt-4 space-y-2">
            {report.statusCounts.map((item) => (
              <div key={item.status} className="flex items-center justify-between rounded-lg bg-surface-elevated px-3 py-2 text-sm">
                <span className="text-primary-soft">{item.status.replace('_', ' ')}</span>
                <span className="font-semibold text-primary">{item.count}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-primary">Department Activity</h2>
          <div className="mt-4 space-y-2">
            {report.departmentActivity.map((item) => (
              <div key={item.clinicId} className="flex items-center justify-between rounded-lg bg-surface-elevated px-3 py-2 text-sm">
                <span className="text-primary-soft">{item.clinicName}</span>
                <span className="font-semibold text-primary">{item.count}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="flex flex-wrap gap-3">
        <form action={formAction}>
          <input type="hidden" name="startDate" value={report.filters.startDate ?? ''} />
          <input type="hidden" name="endDate" value={report.filters.endDate ?? ''} />
          <input type="hidden" name="clinicId" value={report.filters.clinicId ?? ''} />
          <button disabled={pending} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-primary-soft hover:border-accent hover:text-accent disabled:opacity-50">
            {pending ? 'Saving...' : 'Save Snapshot'}
          </button>
        </form>
        <Link href={`/api/reports/csv?${params.toString()}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-soft">
          Export CSV
        </Link>
      </div>
      {state?.message && <p className={`text-sm ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}

      <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-primary">Saved Snapshots</h2>
        <div className="mt-4 space-y-2">
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted">No snapshots saved yet.</p>
          ) : snapshots.map((snapshot) => (
            <div key={snapshot.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-elevated px-3 py-2 text-sm">
              <span className="font-medium text-primary">{snapshot.reportType}</span>
              <span className="text-muted">{snapshot.generatedBy} · {formatDateTime(snapshot.createdAt)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
