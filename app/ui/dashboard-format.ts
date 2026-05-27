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

export function formatRelative(value: string) {
  const now = new Date()
  const date = new Date(value)
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return formatDate(value)
}

export function statusLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    ACCEPTED: 'Accepted',
    SCHEDULED: 'Scheduled',
    FORWARDED: 'Forwarded',
    REJECTED: 'Rejected',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
  }
  return labels[status] ?? status
}

export function statusColor(status: string) {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-700 border-amber-200',
    ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    SCHEDULED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    FORWARDED: 'bg-blue-50 text-blue-700 border-blue-200',
    REJECTED: 'bg-red-50 text-red-700 border-red-200',
    IN_PROGRESS: 'bg-purple-50 text-purple-700 border-purple-200',
    COMPLETED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
  return colors[status] ?? 'bg-gray-50 text-gray-700 border-gray-200'
}

export function genderLabel(gender: string) {
  return gender === 'MALE' ? 'Male' : 'Female'
}
