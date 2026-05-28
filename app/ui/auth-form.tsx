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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background via-background to-surface-elevated px-4 py-12 relative overflow-hidden">
      {/* Background premium decoration */}
      <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-accent/8 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-accent-bright/6 blur-[120px] pointer-events-none" />

      <div ref={cardRef} className="w-full max-w-md rounded-3xl border border-border/80 bg-surface/90 backdrop-blur-md p-8 sm:p-10 shadow-2xl shadow-accent/5 relative overflow-hidden">
        {/* Top brand accent gradient bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent-bright to-accent" />

        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-5 transition-transform duration-300 hover:scale-105">
            <Image
              src="/PatientPath.png"
              alt="PatientPath"
              width={200}
              height={60}
              priority
              style={{ width: '100%', maxWidth: '180px', height: 'auto' }}
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary mt-1">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-muted/90">{subtitle}</p>}
        </div>

        <form action={formAction} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="text-xs font-semibold uppercase tracking-wider text-muted px-0.5">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="rounded-xl border border-border bg-surface-elevated/50 px-4 py-3 text-sm text-primary placeholder:text-muted outline-none transition-all duration-200 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10 focus:shadow-inner"
              placeholder="Enter username"
            />
            {state?.errors?.username && (
              <p className="text-xs text-danger mt-1 px-0.5">{state.errors.username[0]}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted px-0.5">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-xl border border-border bg-surface-elevated/50 px-4 py-3 text-sm text-primary placeholder:text-muted outline-none transition-all duration-200 focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/10 focus:shadow-inner"
              placeholder="Enter password"
            />
            {state?.errors?.password && (
              <p className="text-xs text-danger mt-1 px-0.5">{state.errors.password[0]}</p>
            )}
          </div>

          {state?.message && (
            <p className="rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger mt-1">
              {state.message}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 rounded-xl bg-gradient-to-r from-accent to-accent-bright py-3 text-sm font-semibold text-white shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/35 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:shadow-none disabled:scale-100"
          >
            {pending ? 'Please wait...' : submitLabel}
          </button>
        </form>

        {/* Divider */}
        <div className="my-6 border-t border-border/40" />

        <div className="flex flex-col items-center gap-3 text-center">
          {altHref && altPrompt && altLabel && (
            <p className="text-sm text-muted">
              {altPrompt}{' '}
              <Link href={altHref} className="font-semibold text-accent hover:text-accent-bright transition-colors">
                {altLabel}
              </Link>
            </p>
          )}
          
          <Link href="/reset-password" className="text-xs font-medium text-accent hover:text-accent-bright transition-colors">
            Forgot your password?
          </Link>

          <div className="mt-2 flex items-center gap-3 text-xs text-muted">
            <Link href="/about" className="hover:text-accent transition-colors">About</Link>
            <span className="h-3 w-px bg-border/60" />
            <Link href="/support" className="hover:text-accent transition-colors">Support</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
