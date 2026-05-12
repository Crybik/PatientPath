import { redirect } from 'next/navigation'
import AuthForm from '@/app/ui/auth-form'
import { login } from '@/app/actions/auth'
import { getSession } from '@/app/lib/session'

export const metadata = {
  title: 'Log in · PatientPath',
}

export default async function LoginPage() {
  const session = await getSession()
  if (session) {
    redirect('/dashboard')
  }

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Log in to continue."
      submitLabel="Log in"
      action={login}
      altHref="/register"
      altPrompt="No account yet?"
      altLabel="Create one"
    />
  )
}
