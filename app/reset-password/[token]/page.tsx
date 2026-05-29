import Image from 'next/image'
import Link from 'next/link'
import { ResetPasswordForm } from '@/app/ui/password-reset-forms'

export const metadata = { title: 'Choose New Password - PatientPath' }

export default async function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-md space-y-6">
        <div>
          <Link href="/login" className="text-sm font-medium text-accent hover:text-accent-bright">Back to login</Link>
          <div className="mt-4 mb-2">
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
          <h1 className="mt-2 text-3xl font-bold text-primary">Choose New Password</h1>
          <p className="mt-2 text-sm text-muted">Use the secure link from your reset email to set a new password.</p>
        </div>
        <ResetPasswordForm token={token} />
      </div>
    </main>
  )
}
