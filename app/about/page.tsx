import Link from 'next/link'
import { getSession } from '@/app/lib/session'

export const metadata = { title: 'About - PatientPath' }

export default async function AboutPage() {
  const session = await getSession()

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <Link href={session ? '/dashboard' : '/login'} className="text-sm font-medium text-accent hover:text-accent-bright">
            Back
          </Link>
          <h1 className="mt-4 text-4xl font-bold text-primary">PatientPath</h1>
          <p className="mt-3 max-w-2xl text-primary-soft">
            A digital medical referral network for the University of Jordan student clinic and Jordan University Hospital.
          </p>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            ['Purpose', 'Replace paper-based referrals with traceable digital referrals.'],
            ['Scope', 'Support students, clinic doctors, hospital specialists, lab staff, pharmacy staff, and administrators.'],
            ['Records', 'Centralize referral status, medical history, lab results, prescriptions, attachments, and feedback.'],
          ].map(([title, body]) => (
            <article key={title} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <h2 className="text-sm font-semibold text-primary">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </article>
          ))}
        </section>

        <section className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-primary">Development Team</h2>
          <p className="mt-2 text-sm text-muted">
            Supervised by Prof. Amjad Hudaib. Developed by Jood Mohammad Abdulqader, Saleh Ahmad Barjakly,
            Mahmood Abdullah Al-dawoud, and Rasha Zahran for the 2025-2026 second semester.
          </p>
        </section>
      </div>
    </main>
  )
}
