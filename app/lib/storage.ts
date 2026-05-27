import 'server-only'

import { randomUUID } from 'node:crypto'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024

export type StoredAttachment = {
  r2Key: string
  cloudflareImageId: string | null
  cloudflareVariantUrl: string | null
  storageProvider: string
}

function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured.`)
  return value
}

function r2Client() {
  const accountId = requiredEnv('CLOUDFLARE_R2_ACCOUNT_ID')
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnv('CLOUDFLARE_R2_ACCESS_KEY_ID'),
      secretAccessKey: requiredEnv('CLOUDFLARE_R2_SECRET_ACCESS_KEY'),
    },
  })
}

export function assertAttachmentFile(file: File) {
  if (!file.name || file.size === 0) {
    throw new Error('Choose a file to attach.')
  }
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error('Attachments must be 10 MB or smaller.')
  }
}

export function isImageMime(mimeType: string) {
  return mimeType.startsWith('image/')
}

function safeFileName(fileName: string) {
  return fileName
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .slice(0, 180) || 'attachment'
}

function attachmentKey(referralId: number, fileName: string) {
  return `referrals/${referralId}/${randomUUID()}-${safeFileName(fileName)}`
}

async function uploadToR2(params: {
  referralId: number
  fileName: string
  mimeType: string
  bytes: Uint8Array
}) {
  const bucket = requiredEnv('CLOUDFLARE_R2_BUCKET')
  const key = attachmentKey(params.referralId, params.fileName)

  await r2Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: params.bytes,
      ContentType: params.mimeType || 'application/octet-stream',
      Metadata: {
        originalName: safeFileName(params.fileName),
        referralId: String(params.referralId),
      },
    }),
  )

  return key
}

async function uploadToCloudflareImages(params: {
  fileName: string
  mimeType: string
  bytes: Uint8Array
  metadata: Record<string, string>
}) {
  if (!isImageMime(params.mimeType)) {
    return { id: null, variantUrl: null }
  }

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  const apiToken =
    process.env.CLOUDFLARE_IMAGES_API_TOKEN?.trim() ||
    process.env.CLOUDFLARE_API_TOKEN?.trim() ||
    process.env.CLOUDFLARE_API_KEY?.trim()

  if (!accountId || !apiToken) {
    return { id: null, variantUrl: null }
  }

  const body = new FormData()
  body.append('file', new Blob([params.bytes.buffer as ArrayBuffer], { type: params.mimeType }), safeFileName(params.fileName))
  body.append('requireSignedURLs', 'false')
  body.append('metadata', JSON.stringify(params.metadata))

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/images/v1`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiToken}` },
      body,
    },
  )

  const payload = await response.json().catch(() => null) as {
    success?: boolean
    errors?: { message?: string }[]
    result?: { id?: string; variants?: string[] }
  } | null

  if (!response.ok || !payload?.success) {
    const message = payload?.errors?.map((error) => error.message).filter(Boolean).join('; ')
    throw new Error(message || 'Cloudflare Images upload failed.')
  }

  return {
    id: payload.result?.id ?? null,
    variantUrl: payload.result?.variants?.[0] ?? null,
  }
}

export async function storeAttachment(params: {
  referralId: number
  fileName: string
  mimeType: string
  bytes: Uint8Array
  uploadedById: number
}): Promise<StoredAttachment> {
  const r2Key = await uploadToR2(params)
  const image = await uploadToCloudflareImages({
    fileName: params.fileName,
    mimeType: params.mimeType,
    bytes: params.bytes,
    metadata: {
      referralId: String(params.referralId),
      uploadedById: String(params.uploadedById),
      r2Key,
    },
  })

  return {
    r2Key,
    cloudflareImageId: image.id,
    cloudflareVariantUrl: image.variantUrl,
    storageProvider: image.id ? 'R2+CLOUDFLARE_IMAGES' : 'R2',
  }
}

export async function getR2ReadUrl(r2Key: string, expiresInSeconds = 300) {
  const bucket = requiredEnv('CLOUDFLARE_R2_BUCKET')
  return getSignedUrl(
    r2Client(),
    new GetObjectCommand({
      Bucket: bucket,
      Key: r2Key,
    }),
    { expiresIn: expiresInSeconds },
  )
}
