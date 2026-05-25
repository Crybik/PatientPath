import { redirect } from 'next/navigation'
import { register } from '@/app/actions/auth'
import { getSession } from '@/app/lib/session'
import AuthForm from '@/app/ui/auth-form'

export const metadata = {
  title: 'Create account · PatientPath',
}

export default async function RegisterPage() {
  const session = await getSession()
  if (session) redirect('/dashboard')

  return (
    <AuthForm
      title="Create your account"
      subtitle="Choose the role that describes you."
      submitLabel="Register"
      action={register}
      altHref="/login"
      altPrompt="Already have an account?"
      altLabel="Log in"
      withRole
    />
  )
}
