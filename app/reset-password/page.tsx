import Link from 'next/link'
import { RequestPasswordResetForm } from '@/app/ui/password-reset-forms'

export const metadata = { title: 'Reset Password - PatientPath' }

export default function ResetPasswordRequestPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <Link href="/login" className="text-sm font-medium text-accent hover:text-accent-bright">Back to login</Link>
          <h1 className="mt-4 text-3xl font-bold text-primary">Reset Password</h1>
          <p className="mt-2 text-sm text-muted">Enter your email or username to receive a secure reset link.</p>
        </div>
        <RequestPasswordResetForm />
      </div>
    </main>
  )
}
