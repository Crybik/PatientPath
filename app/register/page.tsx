import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Log in - PatientPath',
}

export default function RegisterPage() {
  redirect('/login')
}
