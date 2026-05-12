'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import type { AuthFormState } from '@/app/actions/auth'
import { REGISTERABLE_ROLES, ROLE_LABELS } from '@/app/lib/roles'

type Action = (
  state: AuthFormState,
  formData: FormData,
) => Promise<AuthFormState>

type Props = {
  title: string
  subtitle?: string
  submitLabel: string
  action: Action
  altHref: string
  altPrompt: string
  altLabel: string
  /** When true, render a role picker. */
  withRole?: boolean
}

export default function AuthForm({
  title,
  subtitle,
  submitLabel,
  action,
  altHref,
  altPrompt,
  altLabel,
  withRole = false,
}: Props) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    action,
    undefined,
  )

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl border border-accent-soft bg-surface p-8 shadow-sm">
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 rounded-full bg-accent-bright"
            />
            <span className="text-xs font-semibold tracking-widest text-accent uppercase">
              PatientPath
            </span>
          </div>
          <h1 className="text-2xl font-semibold text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>

        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="username"
              className="text-sm font-medium text-primary-soft"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              minLength={3}
              maxLength={64}
              className="rounded-md border border-accent-soft bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            {state?.errors?.username && (
              <p className="text-xs text-red-600">{state.errors.username[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label
              htmlFor="password"
              className="text-sm font-medium text-primary-soft"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={withRole ? 'new-password' : 'current-password'}
              required
              minLength={8}
              className="rounded-md border border-accent-soft bg-surface px-3 py-2 text-sm text-primary placeholder:text-muted outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
            {state?.errors?.password && (
              <p className="text-xs text-red-600">{state.errors.password[0]}</p>
            )}
          </div>

          {withRole && (
            <fieldset className="flex flex-col gap-2">
              <legend className="text-sm font-medium text-primary-soft">
                I am a
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {REGISTERABLE_ROLES.map((role, idx) => (
                  <label
                    key={role}
                    className="group cursor-pointer"
                    htmlFor={`role-${role}`}
                  >
                    <input
                      id={`role-${role}`}
                      type="radio"
                      name="role"
                      value={role}
                      defaultChecked={idx === 0}
                      className="peer sr-only"
                      required
                    />
                    <span
                      className="flex items-center justify-center rounded-md border border-accent-soft bg-surface px-3 py-2 text-sm text-primary-soft transition-colors peer-checked:border-accent peer-checked:bg-accent-soft/40 peer-checked:text-primary peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40 hover:border-accent"
                    >
                      {ROLE_LABELS[role]}
                    </span>
                  </label>
                ))}
              </div>
              {state?.errors?.role && (
                <p className="text-xs text-red-600">{state.errors.role[0]}</p>
              )}
            </fieldset>
          )}

          {state?.message && (
            <p
              aria-live="polite"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-primary-soft disabled:opacity-60"
          >
            {pending ? 'Please wait…' : submitLabel}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          {altPrompt}{' '}
          <Link
            href={altHref}
            className="font-medium text-accent underline underline-offset-2 hover:text-primary"
          >
            {altLabel}
          </Link>
        </p>
      </div>
    </div>
  )
}
