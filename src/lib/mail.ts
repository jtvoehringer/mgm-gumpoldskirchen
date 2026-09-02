import 'server-only'
import nodemailer from 'nodemailer'

/**
 * Mailversand über SMTP (Gemeinde-Relay, Variablen SMTP_*).
 * Ohne SMTP-Konfiguration wird still übersprungen – Anträge/Einladungen sind ohnehin im Portal sichtbar.
 * Liefert true bei erfolgreicher Übergabe an den SMTP-Server, sonst false (Fehler wird geloggt).
 */
export async function sendeMail(an: string, betreff: string, text: string, html?: string): Promise<boolean> {
  const host = process.env.SMTP_HOST
  if (!host || !an) return false
  try {
    const port = Number(process.env.SMTP_PORT ?? 587)
    const transport = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
    await transport.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to: an, subject: betreff, text, html })
    return true
  } catch (e) {
    console.error('Mailversand fehlgeschlagen', e)
    return false
  }
}

/** Wie sendeMail, liefert aber die Fehlermeldung (für den Nachweis in der Einladungstabelle) */
export type MailAnhang = { filename: string; content: Buffer; contentType?: string }

export async function sendeMailMitFehler(an: string, betreff: string, text: string, html?: string, anhaenge: MailAnhang[] = []): Promise<{ ok: boolean; fehler?: string }> {
  const host = process.env.SMTP_HOST
  if (!host) return { ok: false, fehler: 'SMTP nicht konfiguriert' }
  try {
    const port = Number(process.env.SMTP_PORT ?? 587)
    const transport = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
    await transport.sendMail({ from: process.env.SMTP_FROM ?? process.env.SMTP_USER, to: an, subject: betreff, text, html, attachments: anhaenge })
    return { ok: true }
  } catch (e) {
    console.error('Mailversand fehlgeschlagen', e)
    return { ok: false, fehler: (e as Error).message?.slice(0, 300) }
  }
}
