'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { requestPasswordReset, resetPassword } from '@/app/actions/password-reset'

export function RequestPasswordResetForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, undefined)

  return (
    <form action={formAction} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <label className="text-sm font-medium text-primary-soft">
        Email or username
        <input name="emailOrUsername" required className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
        {state?.errors?.emailOrUsername && <span className="mt-1 block text-xs text-danger">{state.errors.emailOrUsername[0]}</span>}
      </label>
      {state?.message && <p className={`mt-3 text-sm ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      {state?.devResetUrl && (
        <Link href={state.devResetUrl} className="mt-2 block text-sm font-medium text-accent hover:text-accent-bright">
          Development reset link
        </Link>
      )}
      <button disabled={pending} className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-bright disabled:opacity-50">
        {pending ? 'Sending...' : 'Send Reset Link'}
      </button>
    </form>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, undefined)

  return (
    <form action={formAction} className="rounded-xl border border-border bg-surface p-6 shadow-sm">
      <input type="hidden" name="token" value={token} />
      <label className="text-sm font-medium text-primary-soft">
        New password
        <input name="password" type="password" required className="mt-1 w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
        {state?.errors?.password && <span className="mt-1 block text-xs text-danger">{state.errors.password[0]}</span>}
      </label>
      {state?.message && <p className="mt-3 text-sm text-danger">{state.message}</p>}
      <button disabled={pending} className="mt-5 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-bright disabled:opacity-50">
        {pending ? 'Resetting...' : 'Reset Password'}
      </button>
    </form>
  )
}
