import Link from 'next/link'
import { getSession } from '@/app/lib/session'
import { SupportForm } from '@/app/ui/support-form'

export const metadata = { title: 'Contact Support - PatientPath' }

export default async function SupportPage() {
  const session = await getSession()

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Link href={session ? '/dashboard' : '/login'} className="text-sm font-medium text-accent hover:text-accent-bright">
            Back
          </Link>
          <h1 className="mt-4 text-3xl font-bold text-primary">Contact Support</h1>
          <p className="mt-2 text-sm text-muted">
            Submit a technical issue or workflow support request for the PatientPath team.
          </p>
        </div>
        <SupportForm defaultName={session?.username ?? ''} defaultRole={session?.role ?? ''} />
      </div>
    </main>
  )
}
