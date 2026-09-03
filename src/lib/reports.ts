import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { zeit } from '@/lib/format'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

export const AKTION_LABEL: Record<string, string> = {
  ansicht: 'Ansicht', download: 'Download', login: 'Anmeldung',
  einladung: 'Einladung gesendet', bestaetigung: 'Zugriff bestätigt', zugriff_beendet: 'Zugriff beendet',
}

export type ZugriffsFilter = { sitzung?: string; benutzer?: string; aktion?: string; von?: string; bis?: string; limit?: number }
export type ZugriffsZeile = { id: number; zeitpunkt: string; benutzer: string; email: string; aktion: string; dokument: string; sitzung: string; sitzung_id: string | null }

/** Tagesbeginn (bzw. Beginn des Folgetags) eines Datums in Wiener Zeit als UTC-ISO – Sommer-/Winterzeit berücksichtigt */
function wienerZeitpunkt(datum: string, folgetag: boolean) {
  const d = new Date(`${datum}T00:00:00Z`)
  if (folgetag) d.setUTCDate(d.getUTCDate() + 1)
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Vienna', timeZoneName: 'longOffset' }).formatToParts(d).find(x => x.type === 'timeZoneName')?.value ?? 'GMT+01:00'
  const m = /GMT([+-])(\d{2}):(\d{2})/.exec(p)
  const offsetMin = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3])) : 60
  return new Date(d.getTime() - offsetMin * 60_000).toISOString()
}

/** Zugriffsprotokoll mit Filtern (Verwaltung) – RLS lässt nur die Verwaltung alles sehen */
export async function ladeZugriffe(f: ZugriffsFilter = {}): Promise<ZugriffsZeile[]> {
  const supabase = await createSupabaseServerClient()
  let q = (supabase.from('zugriffs_log') as R)
    .select('id, aktion, zeitpunkt, sitzung_id, profiles(vorname, nachname, email), protokolle(dateiname), sitzungen(titel, datum, gremien(kurz))')
    .order('zeitpunkt', { ascending: false })
  if (f.sitzung)  q = q.eq('sitzung_id', f.sitzung)
  if (f.benutzer) q = q.eq('user_id', f.benutzer)
  if (f.aktion)   q = q.eq('aktion', f.aktion)
  if (f.von)      q = q.gte('zeitpunkt', wienerZeitpunkt(f.von, false))
  if (f.bis)      q = q.lt('zeitpunkt', wienerZeitpunkt(f.bis, true))
  q = q.limit(f.limit ?? 5000)
  const { data } = await q
  return ((data ?? []) as R[]).map(z => ({
    id: z.id, zeitpunkt: z.zeitpunkt,
    benutzer: z.profiles ? `${z.profiles.nachname} ${z.profiles.vorname}`.trim() : '(gelöschter Benutzer)',
    email: z.profiles?.email ?? '', aktion: AKTION_LABEL[z.aktion] ?? z.aktion,
    dokument: z.protokolle?.dateiname ?? '', sitzung_id: z.sitzung_id,
    sitzung: z.sitzungen ? `${z.sitzungen.gremien?.kurz ?? ''} · ${z.sitzungen.titel}` : '',
  }))
}

export function zugriffeAlsTabelle(zeilen: ZugriffsZeile[]) {
  return {
    spalten: ['Zeitpunkt', 'Benutzer', 'E-Mail', 'Aktion', 'Dokument', 'Sitzung'],
    breiten: [95, 130, 170, 110, 170, 220],
    zeilen: zeilen.map(z => [zeit(z.zeitpunkt), z.benutzer, z.email, z.aktion, z.dokument || '–', z.sitzung || '–']),
  }
}

export type NachweisZeile = { mitglied: string; email: string; gesendet: string; bestaetigt: string; geoeffnet: string; fehler: string; kontrolle: boolean }

/** Nachweisliste einer Sitzung: wer eingeladen, wer bestätigt, wer geöffnet */
export async function ladeNachweis(sitzungId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: s } = await (supabase.from('sitzungen') as R)
    .select('id, titel, datum, uhrzeit, status, zugriff_bis, eingeladen_am, gremien(name, kurz), sitzungs_einladungen(kontrolle, gesendet_am, mail_fehler, bestaetigt_am, erste_ansicht_am, profiles(vorname, nachname, email))')
    .eq('id', sitzungId).maybeSingle()
  if (!s) return null
  const zeilen: NachweisZeile[] = ((s.sitzungs_einladungen ?? []) as R[])
    .map(e => ({
      mitglied: `${e.profiles?.nachname ?? ''} ${e.profiles?.vorname ?? ''}`.trim(), email: e.profiles?.email ?? '',
      gesendet: e.gesendet_am ? zeit(e.gesendet_am) : '–', bestaetigt: e.bestaetigt_am ? zeit(e.bestaetigt_am) : '–',
      geoeffnet: e.erste_ansicht_am ? zeit(e.erste_ansicht_am) : '–', fehler: e.mail_fehler ?? '', kontrolle: !!e.kontrolle,
    })).sort((a, b) => Number(a.kontrolle) - Number(b.kontrolle) || a.mitglied.localeCompare(b.mitglied))
  return { sitzung: s as R, zeilen }
}
