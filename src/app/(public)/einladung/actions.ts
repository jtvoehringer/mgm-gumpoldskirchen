'use server'

import { redirect } from 'next/navigation'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

export type EinladungInfo = {
  status: 'offen' | 'abgelaufen' | 'ungueltig'
  id?: string; user_id?: string; email?: string; name?: string; bestaetigt_am?: string | null
  sitzung?: { id: string; titel: string; datum: string; uhrzeit: string | null; ort: string | null; zugriff_bis: string; gremium: string; gremium_key: string; dokumente: number }
}

/** Einladung anhand des persönlichen Tokens laden (Service-Role – die Seite ist ohne Anmeldung erreichbar) */
export async function ladeEinladung(token: string): Promise<EinladungInfo> {
  if (!/^[0-9a-f]{64}$/.test(token)) return { status: 'ungueltig' }
  const admin = createSupabaseAdminClient()
  const { data: e } = await (admin.from('sitzungs_einladungen') as R)
    .select('id, user_id, bestaetigt_am, profiles(email, vorname, nachname, aktiv), sitzungen(id, titel, datum, uhrzeit, ort, status, zugriff_bis, gremien(name, schluessel), protokolle(freigegeben))')
    .eq('token', token).maybeSingle()
  if (!e || !e.profiles?.aktiv) return { status: 'ungueltig' }
  const s = e.sitzungen
  const offen = s.status === 'eingeladen' && s.zugriff_bis && new Date(s.zugriff_bis).getTime() > Date.now()
  return {
    status: offen ? 'offen' : 'abgelaufen',
    id: e.id, user_id: e.user_id, email: e.profiles.email, name: `${e.profiles.vorname} ${e.profiles.nachname}`.trim(), bestaetigt_am: e.bestaetigt_am,
    sitzung: { id: s.id, titel: s.titel, datum: s.datum, uhrzeit: s.uhrzeit, ort: s.ort, zugriff_bis: s.zugriff_bis, gremium: s.gremien?.name ?? '', gremium_key: s.gremien?.schluessel ?? '',
      dokumente: ((s.protokolle ?? []) as R[]).filter(p => p.freigegeben).length },
  }
}

/**
 * „JA, ich möchte zugreifen": Bestätigung protokollieren (Person, Sitzung, Zeitpunkt), dann zu den Unterlagen –
 * angemeldet direkt, sonst über die Anmeldung (E-Mail vorausgefüllt).
 */
export async function einladungBestaetigenAction(form: FormData) {
  const token = String(form.get('token') ?? '')
  const info = await ladeEinladung(token)
  if (info.status !== 'offen' || !info.sitzung) redirect(`/einladung/${token}`)

  const admin = createSupabaseAdminClient()
  if (!info.bestaetigt_am) {
    await admin.from('sitzungs_einladungen').update({ bestaetigt_am: new Date().toISOString() }).eq('id', info.id!)
  }
  await admin.from('zugriffs_log').insert({ user_id: info.user_id, sitzung_id: info.sitzung.id, aktion: 'bestaetigung' })

  const ziel = `/protokolle/${info.sitzung.gremium_key}?sitzung=${info.sitzung.id}`
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user && user.id === info.user_id) redirect(ziel)
  redirect(`/login?weiter=${encodeURIComponent(ziel)}&email=${encodeURIComponent(info.email ?? '')}`)
}
