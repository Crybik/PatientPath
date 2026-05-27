'use client'

import { useActionState } from 'react'
import { uploadReferralAttachment } from '@/app/actions/attachments'
import { requestLabTest } from '@/app/actions/lab-tests'
import { createPrescription } from '@/app/actions/prescriptions'
import type { SerializedReferral } from '@/app/lib/dashboard-types'
import { IconClipboard, IconFlask, IconPill } from '@/app/ui/icons'

const LAB_TEST_OPTIONS = [
  'Complete Blood Count (CBC)',
  'Kidney Function Test (KFT)',
  'Lipid Profile',
  'Fasting Blood Glucose (FBG)',
  'Liver Function Test (LFT)',
  'Thyroid Stimulating Hormone (TSH)',
]

export function ReferralClinicalActions({ referral }: { referral: SerializedReferral }) {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <AttachFileForm referral={referral} />
      <RequestLabTestForm referral={referral} />
      <CreatePrescriptionForm referral={referral} />
    </div>
  )
}

function AttachFileForm({ referral }: { referral: SerializedReferral }) {
  const [state, formAction, pending] = useActionState(uploadReferralAttachment, undefined)

  return (
    <form action={formAction} className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
      <input type="hidden" name="referralId" value={referral.id} />
      <label className="block text-xs font-semibold text-amber-700">
        <IconClipboard className="mr-1 inline h-4 w-4" /> Attach File
        <input
          name="file"
          type="file"
          required
          className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary file:mr-3 file:rounded-md file:border-0 file:bg-amber-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-amber-700"
        />
      </label>
      {state?.message && <p className={`mt-1 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="mt-2 w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50">
        {pending ? 'Uploading...' : 'Attach File'}
      </button>
    </form>
  )
}

function RequestLabTestForm({ referral }: { referral: SerializedReferral }) {
  const [state, formAction, pending] = useActionState(requestLabTest, undefined)

  return (
    <form action={formAction} className="rounded-lg border border-pink-200 bg-pink-50/50 p-3">
      <input type="hidden" name="patientId" value={referral.patient.id} />
      <input type="hidden" name="referralId" value={referral.id} />
      <label className="block text-xs font-semibold text-pink-700">
        <IconFlask className="mr-1 inline h-4 w-4" /> Request Lab Test
        <select name="testType" required className="mt-2 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent">
          {LAB_TEST_OPTIONS.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
      {state?.message && <p className={`mt-1 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      {state?.errors?.testType && <p className="mt-1 text-xs text-danger">{state.errors.testType[0]}</p>}
      <button type="submit" disabled={pending} className="mt-2 w-full rounded-lg bg-pink-600 px-3 py-2 text-xs font-semibold text-white hover:bg-pink-700 disabled:opacity-50">
        {pending ? 'Requesting...' : 'Request Lab Test'}
      </button>
    </form>
  )
}

function CreatePrescriptionForm({ referral }: { referral: SerializedReferral }) {
  const [state, formAction, pending] = useActionState(createPrescription, undefined)

  return (
    <form action={formAction} className="rounded-lg border border-indigo-200 bg-indigo-50/50 p-3">
      <input type="hidden" name="patientId" value={referral.patient.id} />
      <input type="hidden" name="referralId" value={referral.id} />
      <p className="text-xs font-semibold text-indigo-700">
        <IconPill className="mr-1 inline h-4 w-4" /> Create Prescription
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input name="medicationName" required placeholder="Medication name" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
        <input name="dosage" required placeholder="Dosage" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
        <input name="frequency" required placeholder="Frequency" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
        <input name="duration" required placeholder="Duration" className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-accent" />
      </div>
      {state?.message && <p className={`mt-1 text-xs ${state.success ? 'text-success' : 'text-danger'}`}>{state.message}</p>}
      <button type="submit" disabled={pending} className="mt-2 w-full rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
        {pending ? 'Creating...' : 'Create Prescription'}
      </button>
    </form>
  )
}
