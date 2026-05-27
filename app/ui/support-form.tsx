'use client'

import { useActionState } from 'react'
import { submitSupportRequest } from '@/app/actions/support'

export function SupportForm({
  defaultName = '',
  defaultRole = '',
}: {
  defaultName?: string
  defaultRole?: string
}) {
  const [state, formAction, pending] = useActionState(submitSupportRequest, undefined)

  return (
    <form action={formAction} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-primary-soft">
          Name
          <input name="name" defaultValue={defaultName} required className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
          {state?.errors?.name && <span className="mt-1 block text-xs text-danger">{state.errors.name[0]}</span>}
        </label>
        <label className="text-sm font-medium text-primary-soft">
          Email
          <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
          {state?.errors?.email && <span className="mt-1 block text-xs text-danger">{state.errors.email[0]}</span>}
        </label>
        <label className="text-sm font-medium text-primary-soft">
          Role
          <input name="role" defaultValue={defaultRole} className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
        </label>
        <label className="text-sm font-medium text-primary-soft">
          Category
          <select name="category" defaultValue="Technical Issue" className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent">
            <option>Technical Issue</option>
            <option>Account Access</option>
            <option>Referral Workflow</option>
            <option>Data Correction</option>
          </select>
        </label>
      </div>
      <label className="mt-4 block text-sm font-medium text-primary-soft">
        Subject
        <input name="subject" required className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
        {state?.errors?.subject && <span className="mt-1 block text-xs text-danger">{state.errors.subject[0]}</span>}
      </label>
      <label className="mt-4 block text-sm font-medium text-primary-soft">
        Message
        <textarea name="message" rows={6} required className="mt-1 w-full resize-y rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
        {state?.errors?.message && <span className="mt-1 block text-xs text-danger">{state.errors.message[0]}</span>}
      </label>
      {state?.message && <p className={`mt-3 text-sm ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      <button disabled={pending} className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-bright disabled:opacity-50">
        {pending ? 'Submitting...' : 'Submit Support Request'}
      </button>
    </form>
  )
}
