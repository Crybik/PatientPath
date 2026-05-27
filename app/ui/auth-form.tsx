'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useActionState, useEffect, useRef } from 'react'
import { gsap } from 'gsap'
import type { AuthFormState } from '@/app/actions/auth'

type Action = (state: AuthFormState, formData: FormData) => Promise<AuthFormState>

type Props = {
  title: string
  subtitle?: string
  submitLabel: string
  action: Action
  altHref?: string
  altPrompt?: string
  altLabel?: string
}

export default function AuthForm({
  title,
  subtitle,
  submitLabel,
  action,
  altHref,
  altPrompt,
  altLabel,
}: Props) {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(action, undefined)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(
        cardRef.current,
        { y: 30, opacity: 0, scale: 0.97 },
        { y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out' },
      )
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-accent/5 blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-accent-bright/5 blur-3xl translate-x-1/2 translate-y-1/2" />

      <div ref={cardRef} className="w-full max-w-sm rounded-2xl border border-border bg-surface p-8 shadow-xl relative">
        <div className="mb-6">
          <div className="mb-4 flex items-center gap-3">
            <Image
              src="/jordan-university-hospital-logo.png"
              alt="PatientPath"
              width={36}
              height={36}
              priority
              style={{ width: 36, height: 36 }}
              className="rounded-lg"
            />
            <span className="text-xs font-semibold tracking-widest text-accent uppercase">
              PatientPath
            </span>
          </div>
          <h1 className="text-2xl font-bold text-primary">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
        </div>

        <form action={formAction} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className="text-sm font-medium text-primary-soft">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-primary placeholder:text-muted outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
              placeholder="Enter username"
            />
            {state?.errors?.username && (
              <p className="text-xs text-danger">{state.errors.username[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-primary-soft">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-primary placeholder:text-muted outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/15"
              placeholder="Enter password"
            />
            {state?.errors?.password && (
              <p className="text-xs text-danger">{state.errors.password[0]}</p>
            )}
          </div>

          {state?.message && (
            <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-lg bg-gradient-to-r from-accent to-accent-bright px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/20 transition-all hover:shadow-accent/30 disabled:opacity-50 disabled:shadow-none"
          >
            {pending ? 'Please wait...' : submitLabel}
          </button>
        </form>

        {altHref && altPrompt && altLabel && (
          <p className="mt-6 text-sm text-muted">
            {altPrompt}{' '}
            <Link href={altHref} className="font-medium text-accent hover:text-accent-bright transition-colors">
              {altLabel}
            </Link>
          </p>
        )}
        <div className={altHref ? 'mt-3' : 'mt-6'}>
          <Link href="/reset-password" className="mt-3 block text-sm font-medium text-accent hover:text-accent-bright transition-colors">
            Forgot password?
          </Link>
        </div>
        <div className="mt-4 flex gap-3 text-xs text-muted">
          <Link href="/about" className="hover:text-accent">About</Link>
          <Link href="/support" className="hover:text-accent">Support</Link>
        </div>
      </div>
    </div>
  )
}
