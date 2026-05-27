import 'server-only'

import nodemailer from 'nodemailer'

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_FROM)
}

export function appUrl() {
  return process.env.APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
  if (!smtpConfigured()) return { sent: false }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
  })

  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject: 'PatientPath password reset',
    text: `Use this link to reset your PatientPath password: ${resetUrl}\n\nThis link expires in 30 minutes.`,
  })

  return { sent: true }
}
