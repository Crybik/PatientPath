'use client'

import { useActionState } from 'react'
import { updateSupportRequest } from '@/app/actions/support'
import { formatDateTime } from '@/app/ui/dashboard-format'

export type SupportRequestItem = {
  id: number
  name: string
  email: string
  role: string | null
  category: string
  subject: string
  message: string
  status: string
  adminNote: string | null
  createdAt: string
  user: { username: string; role: string } | null
}

export function SupportAdmin({ requests }: { requests: SupportRequestItem[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Support Requests</h1>
        <p className="text-sm text-muted">Review and resolve submitted technical issues.</p>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-8 text-center text-sm text-muted">
          No support requests yet.
        </p>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <SupportRequestCard key={request.id} request={request} />
          ))}
        </div>
      )}
    </div>
  )
}

function SupportRequestCard({ request }: { request: SupportRequestItem }) {
  const [state, formAction, pending] = useActionState(updateSupportRequest, undefined)

  return (
    <article className="rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-primary">{request.subject}</h2>
          <p className="mt-1 text-xs text-muted">
            {request.name} · {request.email} · {request.category} · {formatDateTime(request.createdAt)}
          </p>
        </div>
        <span className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[11px] font-semibold text-muted">
          {request.status.replace('_', ' ')}
        </span>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm text-primary-soft">{request.message}</p>

      <form action={formAction} className="mt-4 grid gap-3 md:grid-cols-[180px_1fr_auto]">
        <input type="hidden" name="requestId" value={request.id} />
        <select name="status" defaultValue={request.status} className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent">
          <option value="OPEN">OPEN</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="RESOLVED">RESOLVED</option>
        </select>
        <input name="adminNote" defaultValue={request.adminNote ?? ''} placeholder="Admin note" className="rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
        <button disabled={pending} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-bright disabled:opacity-50">
          {pending ? 'Saving...' : 'Save'}
        </button>
      </form>
      {state?.message && <p className={`mt-2 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
    </article>
  )
}
