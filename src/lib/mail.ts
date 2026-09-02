import 'server-only'
import nodemailer from 'nodemailer'

/**
 * Benachrichtigungs-Mails (z. B. neuer Zugangsantrag an die Verwaltung).
 * Ohne SMTP-Konfiguration wird still übersprungen – die Anträge sind ohnehin im Portal sichtbar.
 */
export async function sendeMail(an: string, betreff: string, text: string) {
  const host = process.env.SMTP_HOST
  if (!host || !an) return false
  try {
    const transport = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: Number(process.env.SMTP_PORT ?? 587) === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
    await transport.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to: an, subject: betreff, text })
    return true
  } catch (e) {
    console.error('Mailversand fehlgeschlagen', e)
    return false
  }
}
