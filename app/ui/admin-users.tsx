'use client'

import { useState, useTransition } from 'react'
import type { FormEvent } from 'react'
import {
  changeUserPassword,
  changeUserRole,
  createUser,
  deleteUser,
  getUserDetails,
  toggleUserActive,
  type AdminUserRow,
  type CreateUserState,
  type HospitalOption,
} from '@/app/actions/admin'
import { ROLE_LABELS, USER_ROLES, type UserRole } from '@/app/lib/roles'
import { formatDate, formatDateTime } from '@/app/ui/dashboard-format'
import { IconCheck, IconClose, IconEye, IconFreeze, IconKey, IconLoader, IconPlus, IconSearch, IconShield, IconTrash, IconUsers } from '@/app/ui/icons'
import { AnimatePresence, FadeInUp, motion, StaggerContainer, StaggerItem } from '@/app/ui/motion'
import { StatCard } from '@/app/ui/stat-card'

type UserRow = AdminUserRow

type UserDetails = Awaited<ReturnType<typeof getUserDetails>>
type LoadedUserDetails = NonNullable<UserDetails>
type PatientVisitDetails = NonNullable<LoadedUserDetails['patientProfile']>['visits'][number]
type NotificationDetails = LoadedUserDetails['notifications'][number]

const ROLE_BADGE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-50 text-purple-700 border-purple-200',
  DOCTOR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SPECIALIST: 'bg-amber-50 text-amber-700 border-amber-200',
  PATIENT: 'bg-blue-50 text-blue-700 border-blue-200',
  LAB_STAFF: 'bg-rose-50 text-rose-700 border-rose-200',
  PHARMACY_STAFF: 'bg-indigo-50 text-indigo-700 border-indigo-200',
}

export function AdminUsers({
  initialUsers,
  hospitals,
}: {
  initialUsers: UserRow[]
  hospitals: HospitalOption[]
}) {
  const [users, setUsers] = useState(initialUsers)
  const [selectedUser, setSelectedUser] = useState<UserDetails>(null)
  const [selectedRow, setSelectedRow] = useState<UserRow | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')

  const filtered = users
    .filter((u) => filter === 'ALL' || u.role === filter)
    .filter((u) => !search || u.username.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase()))

  async function openUserDetails(user: UserRow) {
    setSelectedRow(user)
    setDetailsLoading(true)
    try {
      const details = await getUserDetails(user.id)
      setSelectedUser(details)
    } catch { /* silent */ }
    finally { setDetailsLoading(false) }
  }

  function handleUserUpdated(updated: UserRow) {
    setUsers((prev) => prev.map((u) => u.id === updated.id ? updated : u))
    setSelectedRow(updated)
  }

  function handleUserCreated(created: UserRow) {
    setUsers((prev) => [created, ...prev.filter((u) => u.id !== created.id)])
    setFilter('ALL')
    setSearch(created.username)
    setShowCreateModal(false)
  }

  return (
    <div className="space-y-6">
      <FadeInUp>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary to-primary-soft p-2.5 shadow-lg shadow-primary/10">
              <IconUsers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary">User Management</h1>
              <p className="text-sm text-muted">{users.length} registered users</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-accent-bright disabled:opacity-60"
          >
            <IconPlus className="w-4 h-4" />
            Create User
          </button>
        </div>
      </FadeInUp>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={users.length} icon={<IconUsers className="w-4 h-4" />} />
        <StatCard label="Active" value={users.filter(u => u.isActive).length} color="text-success" />
        <StatCard label="Frozen" value={users.filter(u => !u.isActive).length} color="text-danger" />
        <StatCard label="Admins" value={users.filter(u => u.role === 'SUPER_ADMIN').length} icon={<IconShield className="w-4 h-4" />} color="text-primary" />
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username or email..."
            className="w-full rounded-xl border border-border bg-surface pl-10 pr-4 py-2.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {['ALL', ...USER_ROLES].map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${filter === f ? 'bg-accent text-white shadow-sm shadow-accent/20' : 'border border-border text-muted hover:text-primary hover:border-accent/40'}`}>
              {f === 'ALL' ? 'All' : ROLE_LABELS[f as UserRole]}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
        {/* Table header */}
        <div className="hidden lg:grid lg:grid-cols-[2fr_1.5fr_1fr_1fr_0.8fr_0.5fr] gap-4 px-5 py-3 border-b border-border bg-surface-elevated text-[11px] font-semibold uppercase tracking-wider text-muted">
          <span>User</span>
          <span>Email</span>
          <span>Password</span>
          <span>Role</span>
          <span>Status</span>
          <span className="text-right">View</span>
        </div>

        {/* User rows */}
        <StaggerContainer className="divide-y divide-border">
          {filtered.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-muted">No users match your search.</div>
          ) : (
            filtered.map((user) => (
              <StaggerItem key={user.id}>
                <div
                  className={`px-5 py-4 transition-all cursor-pointer ${!user.isActive ? 'bg-danger/[0.02]' : 'hover:bg-surface-elevated/50'}`}
                  onClick={() => openUserDetails(user)}
                >
                  <div className="flex flex-col lg:grid lg:grid-cols-[2fr_1.5fr_1fr_1fr_0.8fr_0.5fr] gap-3 lg:gap-4 lg:items-center">
                    {/* User info */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent uppercase">
                        {user.username.slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-primary">{user.username}</p>
                        <p className="text-[11px] text-muted">ID: {user.id}</p>
                      </div>
                    </div>

                    {/* Email */}
                    <p className="text-sm text-primary-soft truncate">{user.email ?? <span className="text-muted italic">No email</span>}</p>

                    {/* Password (plaintext) */}
                    <div>
                      <code className="rounded bg-surface-elevated px-2 py-0.5 text-xs font-mono text-primary border border-border">
                        {user.plainPassword ?? '••••'}
                      </code>
                    </div>

                    {/* Role */}
                    <div>
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_BADGE_COLORS[user.role] ?? 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </div>

                    {/* Status */}
                    <div>
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success">
                          <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-0.5 text-[11px] font-semibold text-danger">
                          <IconFreeze className="w-3 h-3" /> Frozen
                        </span>
                      )}
                    </div>

                    {/* View button */}
                    <div className="flex justify-end">
                      <div className="rounded-lg p-2 text-muted hover:text-accent hover:bg-accent/5 transition-all">
                        <IconEye className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              </StaggerItem>
            ))
          )}
        </StaggerContainer>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <CreateUserModal
            hospitals={hospitals}
            onClose={() => setShowCreateModal(false)}
            onCreated={handleUserCreated}
          />
        )}
      </AnimatePresence>

      {/* User Detail Modal with Actions */}
      <AnimatePresence>
        {(selectedUser || detailsLoading) && (
          <UserDetailModal
            user={selectedUser}
            row={selectedRow}
            loading={detailsLoading}
            onClose={() => { setSelectedUser(null); setSelectedRow(null) }}
            onUpdated={handleUserUpdated}
            onDeleted={(id) => { setUsers((prev) => prev.filter((u) => u.id !== id)); setSelectedUser(null); setSelectedRow(null) }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function CreateUserModal({
  hospitals,
  onClose,
  onCreated,
}: {
  hospitals: HospitalOption[]
  onClose: () => void
  onCreated: (user: UserRow) => void
}) {
  const [state, setState] = useState<CreateUserState>(undefined)
  const [pending, startCreateTransition] = useTransition()
  const [role, setRole] = useState<UserRole>('PATIENT')
  const [includeVisit, setIncludeVisit] = useState(false)
  const isPatient = role === 'PATIENT'
  const isStaff = role === 'DOCTOR' || role === 'SPECIALIST' || role === 'LAB_STAFF' || role === 'PHARMACY_STAFF'
  const isSpecialist = role === 'SPECIALIST'

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const payload: Record<string, string> = {}
    formData.forEach((value, key) => {
      if (typeof value === 'string') payload[key] = value
    })

    startCreateTransition(async () => {
      const result = await createUser(undefined, payload)
      setState(result)
      if (result?.success && result.user) {
        onCreated(result.user)
      }
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/25 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 18 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: 18 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
        data-testid="create-user-modal"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-primary">Create User</h2>
            <p className="text-xs text-muted">Admins create accounts and assign role access.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border p-2 text-muted transition-all hover:bg-surface-elevated hover:text-primary"
            aria-label="Close create user"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6" noValidate>
          <fieldset className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
            <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
              Account
            </legend>
            <TextInput
              label="Username"
              name="username"
              autoComplete="username"
              required
              error={firstError(state, 'username')}
              placeholder="e.g. saleh.ahmad"
            />
            <TextInput
              label="Email"
              name="email"
              type="email"
              autoComplete="email"
              required
              error={firstError(state, 'email')}
              placeholder="name@ju.edu.jo"
            />
            <TextInput
              label="Password"
              name="password"
              type="text"
              autoComplete="new-password"
              required
              error={firstError(state, 'password')}
              placeholder="Temporary password"
            />
            <label className="flex flex-col gap-1.5 text-sm font-medium text-primary-soft">
              Role
              <select
                name="role"
                value={role}
                onChange={(event) => {
                  const nextRole = event.target.value as UserRole
                  setRole(nextRole)
                  if (nextRole !== 'PATIENT') setIncludeVisit(false)
                }}
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10"
              >
                {USER_ROLES.map((userRole) => (
                  <option key={userRole} value={userRole}>
                    {ROLE_LABELS[userRole]}
                  </option>
                ))}
              </select>
              <ErrorText message={firstError(state, 'role')} />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium text-primary-soft">
              Account status
              <select
                name="isActive"
                defaultValue="true"
                className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10"
              >
                <option value="true">Active</option>
                <option value="false">Frozen</option>
              </select>
            </label>
          </fieldset>

          {isPatient && (
            <fieldset className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
              <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Patient Profile
              </legend>
              <TextInput
                label="Full name"
                name="patientFullName"
                required
                error={firstError(state, 'patientFullName')}
                placeholder="Student full name"
              />
              <TextInput
                label="University ID"
                name="uniId"
                required
                error={firstError(state, 'uniId')}
                placeholder="e.g. 0233949"
              />
              <label className="flex flex-col gap-1.5 text-sm font-medium text-primary-soft">
                Gender
                <select
                  name="gender"
                  defaultValue=""
                  className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10"
                >
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
                <ErrorText message={firstError(state, 'gender')} />
              </label>
              <TextInput
                label="Date of birth"
                name="dob"
                type="date"
                required
                error={firstError(state, 'dob')}
              />
              <TextInput
                label="Phone"
                name="phoneNumber"
                type="tel"
                error={firstError(state, 'phoneNumber')}
                placeholder="+962..."
              />
              <TextInput
                label="Faculty"
                name="faculty"
                error={firstError(state, 'faculty')}
                placeholder="Optional"
              />
              <label className="flex items-center gap-2 text-sm font-medium text-primary-soft sm:col-span-2">
                <input
                  type="checkbox"
                  checked={includeVisit}
                  onChange={(event) => setIncludeVisit(event.target.checked)}
                  className="h-4 w-4 rounded border-border text-accent focus:ring-accent/20"
                />
                Add visit history
              </label>
              {includeVisit && (
                <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                  <TextInput
                    label="Visit hospital"
                    name="visitHospitalName"
                    error={firstError(state, 'visitHospitalName')}
                    placeholder="Hospital name"
                  />
                  <TextInput
                    label="Visit clinic"
                    name="visitClinicName"
                    error={firstError(state, 'visitClinicName')}
                    placeholder="Clinic name"
                  />
                  <TextInput
                    label="Visit doctor"
                    name="visitDoctorName"
                    error={firstError(state, 'visitDoctorName')}
                    placeholder="Doctor name"
                  />
                  <TextInput
                    label="Visit date"
                    name="visitDate"
                    type="date"
                    error={firstError(state, 'visitDate')}
                  />
                  <TextInput
                    label="Visit summary"
                    name="visitSummary"
                    error={firstError(state, 'visitSummary')}
                    placeholder="Brief summary"
                  />
                  <TextInput
                    label="Visit notes"
                    name="visitNotes"
                    error={firstError(state, 'visitNotes')}
                    placeholder="Optional notes"
                  />
                </div>
              )}
            </fieldset>
          )}

          {isStaff && (
            <fieldset className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
              <legend className="px-1 text-[11px] font-semibold uppercase tracking-wider text-muted">
                Staff Profile
              </legend>
              <TextInput
                label="Full name"
                name="staffFullName"
                required
                error={firstError(state, 'staffFullName')}
                placeholder="Staff full name"
              />
              <TextInput
                label="Title"
                name="staffTitle"
                required
                error={firstError(state, 'staffTitle')}
                placeholder="e.g. Referring Doctor"
              />
              <TextInput
                label="Specialization"
                name="specialization"
                error={firstError(state, 'specialization')}
                placeholder="Optional"
              />
              <TextInput
                label="Department"
                name="department"
                error={firstError(state, 'department')}
                placeholder="Optional"
              />
              {role === 'LAB_STAFF' && (
                <TextInput
                  label="Lab section"
                  name="labSection"
                  error={firstError(state, 'labSection')}
                  placeholder="Optional"
                />
              )}
              <label className="flex flex-col gap-1.5 text-sm font-medium text-primary-soft">
                Hospital {isSpecialist ? '' : <span className="text-muted">(optional)</span>}
                <select
                  name="hospitalId"
                  defaultValue=""
                  className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10"
                >
                  <option value="">Select hospital</option>
                  {hospitals.map((hospital) => (
                    <option key={hospital.id} value={hospital.id}>
                      {hospital.name} ({hospital.city})
                    </option>
                  ))}
                </select>
                <ErrorText message={firstError(state, 'hospitalId')} />
              </label>
            </fieldset>
          )}

          {state?.message && !state.success && (
            <p className="rounded-lg border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">
              {state.message}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-muted transition-all hover:bg-surface-elevated hover:text-primary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-accent/20 transition-all hover:bg-accent-bright disabled:opacity-60"
            >
              {pending && <IconLoader className="w-4 h-4 animate-spin" />}
              {pending ? 'Creating...' : 'Create account'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function UserDetailModal({ user, row, loading, onClose, onUpdated, onDeleted }: {
  user: UserDetails
  row: UserRow | null
  loading: boolean
  onClose: () => void
  onUpdated: (u: UserRow) => void
  onDeleted: (id: number) => void
}) {
  const [isPending, startTransition] = useTransition()
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const notifications = user?.notifications ?? []

  function handleToggle() {
    if (!row) return
    startTransition(async () => {
      await toggleUserActive(row.id)
      onUpdated({ ...row, isActive: !row.isActive })
      setActionMsg(row.isActive ? 'User frozen' : 'User activated')
      setTimeout(() => setActionMsg(''), 2000)
    })
  }

  function handleRoleChange(role: UserRole) {
    if (!row) return
    startTransition(async () => {
      await changeUserRole(row.id, role)
      onUpdated({ ...row, role })
      setActionMsg('Role updated')
      setTimeout(() => setActionMsg(''), 2000)
    })
  }

  function handleDelete() {
    if (!row) return
    if (!confirm(`Delete "${row.username}"? This cannot be undone.`)) return
    startTransition(async () => {
      await deleteUser(row.id)
      onDeleted(row.id)
    })
  }

  function handlePasswordChange() {
    if (!row || !newPassword) return
    startTransition(async () => {
      const res = await changeUserPassword(row.id, newPassword)
      if (res?.success) {
        onUpdated({ ...row, plainPassword: newPassword })
        setActionMsg('Password changed')
        setNewPassword('')
        setShowPasswordInput(false)
      } else {
        setActionMsg(res?.message ?? 'Error')
      }
      setTimeout(() => setActionMsg(''), 2000)
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-surface px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent uppercase">
              {row?.username.slice(0, 2) ?? '..'}
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary">{row?.username ?? 'Loading...'}</h2>
              <p className="text-xs text-muted">{row ? `${ROLE_LABELS[row.role]} · ${row.isActive ? 'Active' : 'Frozen'}` : ''}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg border border-border p-2 text-muted hover:text-primary hover:bg-surface-elevated transition-all">
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <IconLoader className="w-6 h-6 text-accent animate-spin" />
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* ─── Actions Panel ─────────────────────────────────── */}
            <div className="rounded-xl border border-accent/20 bg-accent/[0.03] p-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-3">Actions</h3>

              <div className="space-y-3">
                {/* Change Role */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary-soft">Role</span>
                  <select
                    value={row?.role ?? ''}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    disabled={isPending}
                    className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm text-primary outline-none focus:border-accent"
                  >
                    {USER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>

                {/* Change Password */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary-soft">Password</span>
                  {showPasswordInput ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className="w-36 rounded-lg border border-border bg-surface-elevated px-3 py-1.5 text-sm outline-none focus:border-accent"
                        autoFocus
                      />
                      <button onClick={handlePasswordChange} disabled={isPending || !newPassword} className="rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
                        Save
                      </button>
                      <button onClick={() => setShowPasswordInput(false)} className="rounded-lg p-1.5 text-muted hover:text-primary">
                        <IconClose className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setShowPasswordInput(true)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-primary hover:border-accent/40 transition-all">
                      <IconKey className="w-3.5 h-3.5" /> Change Password
                    </button>
                  )}
                </div>

                {/* Freeze / Unfreeze */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-primary-soft">Account Status</span>
                  <button
                    onClick={handleToggle}
                    disabled={isPending}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                      row?.isActive
                        ? 'border-warning/30 text-warning hover:bg-warning/5'
                        : 'border-success/30 text-success hover:bg-success/5'
                    }`}
                  >
                    <IconFreeze className="w-3.5 h-3.5" />
                    {row?.isActive ? 'Freeze Account' : 'Unfreeze Account'}
                  </button>
                </div>

                {/* Delete */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <span className="text-sm text-danger">Danger Zone</span>
                  <button
                    onClick={handleDelete}
                    disabled={isPending}
                    className="flex items-center gap-1.5 rounded-lg border border-danger/30 px-3 py-1.5 text-xs font-medium text-danger hover:bg-danger/5 transition-all"
                  >
                    <IconTrash className="w-3.5 h-3.5" /> Delete User
                  </button>
                </div>
              </div>

              {/* Action feedback */}
              <AnimatePresence>
                {actionMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-3 flex items-center gap-1.5 text-xs font-medium text-success"
                  >
                    <IconCheck className="w-3.5 h-3.5" /> {actionMsg}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ─── Account Info ───────────────────────────────────── */}
            <Section title="Account Info">
              <div className="grid grid-cols-2 gap-4">
                <Field label="ID" value={String(user?.id ?? row?.id ?? '')} />
                <Field label="Email" value={user?.email ?? row?.email ?? 'Not set'} />
                <Field label="Password" value={row?.plainPassword ?? '(unknown)'} highlight />
                <Field label="Created" value={formatDateTime(user?.createdAt?.toISOString?.() ?? row?.createdAt ?? '')} />
              </div>
            </Section>

            {/* Patient Profile */}
            {user?.patientProfile && (
              <Section title="Patient Profile">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name" value={user.patientProfile.fullName} />
                  <Field label="University ID" value={user.patientProfile.uniId} highlight />
                  <Field label="Gender" value={user.patientProfile.gender} />
                  <Field label="Date of Birth" value={user.patientProfile.dob?.toISOString?.()?.split('T')[0] ?? '—'} />
                  <Field label="Phone" value={user.patientProfile.phoneNumber ?? '—'} />
                  <Field label="Faculty" value={user.patientProfile.faculty ?? '—'} />
                </div>

                {user.patientProfile.visits?.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold text-muted mb-2">Visit History ({user.patientProfile.visits.length})</p>
                    <div className="max-h-48 overflow-y-auto space-y-2 rounded-lg border border-border p-2">
                      {user.patientProfile.visits.map((v: PatientVisitDetails) => (
                        <div key={v.id} className="rounded-lg bg-surface-elevated p-3 text-xs">
                          <div className="flex justify-between">
                            <span className="font-semibold text-primary">{v.hospitalName}</span>
                            <span className="text-muted">{formatDate(v.visitedAt?.toISOString?.() ?? v.visitedAt)}</span>
                          </div>
                          <p className="text-muted mt-0.5">{v.clinicName} · {v.doctorName}</p>
                          <p className="text-primary-soft mt-1">{v.summary}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Section>
            )}

            {/* Staff Profile */}
            {user?.staffProfile && (
              <Section title="Staff Profile">
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Full Name" value={user.staffProfile.fullName} />
                  <Field label="Title" value={user.staffProfile.title} />
                  <Field label="Specialization" value={user.staffProfile.specialization ?? '—'} />
                  <Field label="Department" value={user.staffProfile.department ?? '—'} />
                  <Field label="Lab Section" value={user.staffProfile.labSection ?? '—'} />
                </div>
              </Section>
            )}

            {/* Notifications */}
            {notifications.length > 0 && (
              <Section title={`Recent Notifications (${notifications.length})`}>
                <div className="max-h-36 overflow-y-auto space-y-1.5">
                  {notifications.slice(0, 15).map((n: NotificationDetails) => (
                    <div key={n.id} className="flex items-start gap-2 text-xs py-1">
                      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${n.isRead ? 'bg-border' : 'bg-accent'}`} />
                      <div>
                        <p className={n.isRead ? 'text-muted' : 'text-primary'}>{n.message}</p>
                        <p className="text-[10px] text-muted mt-0.5">{formatDateTime(n.createdAt?.toISOString?.() ?? n.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

function firstError(state: CreateUserState, field: string) {
  return state?.errors?.[field]?.[0]
}

function ErrorText({ message }: { message?: string }) {
  if (!message) return null
  return <span className="text-xs font-medium text-danger">{message}</span>
}

function TextInput({
  label,
  name,
  type = 'text',
  autoComplete,
  placeholder,
  required,
  error,
}: {
  label: string
  name: string
  type?: string
  autoComplete?: string
  placeholder?: string
  required?: boolean
  error?: string
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium text-primary-soft">
      {label} {required ? <span className="text-danger">*</span> : null}
      <input
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={Boolean(error)}
        aria-required={required}
        className="rounded-lg border border-border bg-surface-elevated px-3 py-2.5 text-sm text-primary outline-none transition-all placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/10"
      />
      <ErrorText message={error} />
    </label>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-muted mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] text-muted mb-0.5">{label}</p>
      {highlight ? (
        <code className="rounded bg-accent/5 border border-accent/20 px-2 py-0.5 text-sm font-mono font-semibold text-accent">{value}</code>
      ) : (
        <p className="text-sm font-medium text-primary">{value}</p>
      )}
    </div>
  )
}
