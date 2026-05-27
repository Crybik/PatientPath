import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { canAccessReferral } from '@/app/lib/referral-access'
import { prisma, ready } from '@/app/lib/prisma'
import { getSession } from '@/app/lib/session'
import { getR2ReadUrl } from '@/app/lib/storage'

export async function GET(
  _request: NextRequest,
  context: {
    params: Promise<{ attachmentId: string }>
  },
) {
  const session = await getSession()
  if (!session) return Response.json({ message: 'Unauthorized' }, { status: 401 })

  const { attachmentId } = await context.params
  const parsedId = Number(attachmentId)
  if (!Number.isInteger(parsedId)) {
    return Response.json({ message: 'Invalid attachment' }, { status: 400 })
  }

  await ready()
  const attachment = await prisma.attachment.findUnique({
    where: { id: parsedId },
    select: { referralId: true, r2Key: true },
  })
  if (!attachment?.r2Key) {
    return Response.json({ message: 'Attachment was not found' }, { status: 404 })
  }

  const allowed = await canAccessReferral(session, attachment.referralId)
  if (!allowed) return Response.json({ message: 'Forbidden' }, { status: 403 })

  const url = await getR2ReadUrl(attachment.r2Key)
  return NextResponse.redirect(url)
}
