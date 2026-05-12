export function formatDate(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value: string | null) {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat('en', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function statusLabel(status: string) {
  if (status === 'PENDING') return 'Pending specialist review'
  if (status === 'ACCEPTED') return 'Accepted'
  if (status === 'FORWARDED') return 'Forwarded again'
  return status
}

export function genderLabel(gender: string) {
  return gender === 'MALE' ? 'Male' : 'Female'
}
