import { logout } from '@/app/actions/auth'
import type { DashboardRole } from '@/app/lib/dashboard-types'
import { ROLE_LABELS } from '@/app/lib/roles'

type NavItem = {
  href: string
  label: string
}

export function DashboardShell({
  username,
  role,
  nav,
  children,
}: {
  username: string
  role: DashboardRole
  nav: NavItem[]
  children: React.ReactNode
}) {
  const roleLabel = ROLE_LABELS[role as keyof typeof ROLE_LABELS]

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        <aside className="border-b border-accent-soft bg-surface px-4 py-4 shadow-sm lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-80 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
          <div className="rounded-lg border border-accent-soft bg-background p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-sm font-bold text-surface shadow-sm">
                PP
              </div>
              <div>
                <p className="text-sm font-semibold text-primary">PatientPath</p>
                <p className="text-xs text-muted">{roleLabel}</p>
              </div>
            </div>
          </div>

          <nav className="mt-5 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
            {nav.map((item) => (
              <a
                key={`${item.href}-${item.label}`}
                href={item.href}
                className="whitespace-nowrap rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium text-primary-soft transition-colors hover:border-accent-soft hover:bg-accent-soft/35 hover:text-primary"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-5 lg:mt-auto">
            <div className="rounded-lg border border-accent-soft bg-background p-3">
              <p className="text-sm font-semibold text-primary">{username}</p>
              <p className="text-xs text-muted">{roleLabel}</p>
            </div>

            <form action={logout} className="mt-3">
              <button
                type="submit"
                className="w-full rounded-lg border border-primary px-3 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-accent-soft/35"
              >
                Log out
              </button>
            </form>
          </div>
        </aside>

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-6xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
