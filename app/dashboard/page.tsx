import { redirect } from 'next/navigation'
import { UserRole } from '@/app/generated/prisma'
import {
  getAllReferrals,
  getDoctorReferrals,
  getHospitalsWithClinics,
  getPatientDashboard,
  getSpecialistReferrals,
} from '@/app/lib/clinical-data'
import type { DashboardRole, SerializedReferral } from '@/app/lib/dashboard-types'
import { getSession } from '@/app/lib/session'
import { DashboardShell } from '@/app/ui/dashboard-shell'
import { DoctorForwardNote } from '@/app/ui/doctor-forward-note'
import { PatientTracker } from '@/app/ui/patient-tracker'
import { ReferralCard } from '@/app/ui/referral-card'
import { SpecialistQueue } from '@/app/ui/specialist-queue'

export const metadata = {
  title: 'Dashboard - PatientPath',
}

const nav = {
  [UserRole.DOCTOR]: [
    { href: '#forward-note', label: 'Forward Note' },
    { href: '#patient-forwards', label: 'Patient Forwards' },
    { href: '#doctor-history', label: 'My History' },
  ],
  [UserRole.SPECIALIST]: [
    { href: '#specialist-queue', label: 'Referral Queue' },
    { href: '#specialist-queue', label: 'Accept' },
    { href: '#specialist-queue', label: 'Forward Again' },
  ],
  [UserRole.PATIENT]: [
    { href: '#patient-dashboard', label: 'Main' },
    { href: '#patient-forwards', label: 'Forwards' },
    { href: '#visit-history', label: 'Visit History' },
  ],
  [UserRole.SUPER_ADMIN]: [
    { href: '#admin-overview', label: 'Overview' },
    { href: '#all-forwards', label: 'All Forwards' },
  ],
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  let content: React.ReactNode

  if (session.role === UserRole.DOCTOR) {
    const [hospitals, referrals] = await Promise.all([
      getHospitalsWithClinics(),
      getDoctorReferrals(session.userId),
    ])
    content = <DoctorForwardNote hospitals={hospitals} recentReferrals={referrals} />
  } else if (session.role === UserRole.SPECIALIST) {
    const [hospitals, referrals] = await Promise.all([
      getHospitalsWithClinics(),
      getSpecialistReferrals(session.userId),
    ])
    content = <SpecialistQueue hospitals={hospitals} initialReferrals={referrals} />
  } else if (session.role === UserRole.PATIENT) {
    const dashboard = await getPatientDashboard(session.userId)
    content = dashboard ? (
      <PatientTracker
        patient={dashboard.patient}
        visits={dashboard.visits}
        initialReferrals={dashboard.referrals}
      />
    ) : (
      <MissingProfile role="patient" />
    )
  } else {
    content = <AdminOverview referrals={await getAllReferrals()} />
  }

  return (
    <DashboardShell
      username={session.username}
      role={session.role as DashboardRole}
      nav={nav[session.role]}
    >
      {content}
    </DashboardShell>
  )
}

function MissingProfile({ role }: { role: string }) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-900">
      <h1 className="text-xl font-semibold">Missing {role} profile</h1>
      <p className="mt-2 text-sm">
        This account can log in, but it is not connected to a seeded clinical
        profile yet.
      </p>
    </div>
  )
}

function AdminOverview({ referrals }: { referrals: SerializedReferral[] }) {
  const pending = referrals.filter((referral) => referral.status === 'PENDING').length
  const accepted = referrals.filter(
    (referral) => referral.status === 'ACCEPTED',
  ).length
  const forwarded = referrals.filter(
    (referral) => referral.status === 'FORWARDED',
  ).length

  return (
    <div className="space-y-8">
      <section id="admin-overview" className="space-y-5">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent">
            Admin Overview
          </p>
          <h1 className="mt-1 text-3xl font-semibold text-primary">
            PatientPath referral activity
          </h1>
        </div>
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Total" value={referrals.length} />
          <Stat label="Pending" value={pending} />
          <Stat label="Accepted" value={accepted} />
          <Stat label="Forwarded" value={forwarded} />
        </div>
      </section>

      <section id="all-forwards" className="space-y-4">
        <h2 className="text-xl font-semibold text-primary">All forwards</h2>
        {referrals.length === 0 ? (
          <p className="rounded-lg border border-accent-soft bg-surface p-4 text-sm text-muted">
            No forwards exist yet.
          </p>
        ) : (
          <div className="space-y-4">
            {referrals.map((referral) => (
              <ReferralCard key={referral.id} referral={referral} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-accent-soft bg-surface p-4 shadow-sm">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-primary">{value}</p>
    </div>
  )
}
