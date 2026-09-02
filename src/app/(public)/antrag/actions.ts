'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { sendeMail } from '@/lib/mail'

export type AntragState = { ok: boolean; fehler?: string }

/** Zugangsantrag einreichen – schreibt über die RPC stelle_zugangsantrag (anon-fähig, validiert serverseitig) */
export async function antragSendenAction(_prev: AntragState, form: FormData): Promise<AntragState> {
  const feld = (k: string) => String(form.get(k) ?? '').trim()
  const gremien = form.getAll('gremien').map(String)
  if (!feld('datenschutz')) return { ok: false, fehler: 'Bitte die Hinweise zum Datenschutz bestätigen.' }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.rpc('stelle_zugangsantrag', {
    p_vorname: feld('vorname'), p_nachname: feld('nachname'), p_email: feld('email'), p_telefon: feld('telefon'),
    p_funktion: feld('funktion'), p_fraktion: feld('fraktion'), p_gremien: gremien, p_nachricht: feld('nachricht'),
  })
  if (error) return { ok: false, fehler: error.message.replace(/^.*?: /, '') }

  await sendeMail(
    process.env.VERWALTUNG_EMAIL ?? '',
    `Neuer Zugangsantrag: ${feld('vorname')} ${feld('nachname')}`,
    `${feld('vorname')} ${feld('nachname')} (${feld('funktion')}) hat Zugang zu den Sitzungsprotokollen beantragt.\n` +
    `Gremien: ${gremien.join(', ')}\nE-Mail: ${feld('email')}\n\nPrüfung und Freigabe: ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/verwaltung/antraege`
  )
  return { ok: true }
}
