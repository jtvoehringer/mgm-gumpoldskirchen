import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'
export { sitzungStatus, type SitzungStatus } from './sitzung-status'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

export type Gremium = { id: string; schluessel: string; name: string; kurz: string; sortierung: number }
export type Protokoll = { id: string; dateiname: string; groesse: number | null; typ: string; freigegeben: boolean; hochgeladen_am: string }
export type Einladung = { id: string; user_id: string; gesendet_am: string | null; mail_fehler: string | null; bestaetigt_am: string | null; erste_ansicht_am: string | null; profil: { vorname: string; nachname: string; email: string } | null }
export type Sitzung = {
  id: string; datum: string; uhrzeit: string | null; ort: string | null; titel: string; nummer: number | null; notiz: string | null
  status: 'entwurf' | 'eingeladen'; zugriff_bis: string | null; eingeladen_am: string | null; zugriff_beendet_am: string | null
  gremium: Gremium; protokolle: Protokoll[]
  einladungen: Einladung[]   // nur für Verwaltung/Schriftführung befüllt
}

const TYP_RANG: Record<string, number> = { einladung: 0, protokoll: 1, beilage: 2 }

export async function ladeGremien(): Promise<Gremium[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('gremien').select('*').order('sortierung')
  return (data ?? []) as Gremium[]
}

/** Sitzungen inkl. Protokolle – RLS filtert bereits nach Gremiums-Berechtigung und Freigabe */
export async function ladeSitzungen(opts: { gremium?: string; jahr?: number; limit?: number; mitEinladungen?: boolean } = {}): Promise<Sitzung[]> {
  const supabase = await createSupabaseServerClient()
  const einl = opts.mitEinladungen ? ', einladungen:sitzungs_einladungen(id, user_id, gesendet_am, mail_fehler, bestaetigt_am, erste_ansicht_am, profil:profiles(vorname, nachname, email))' : ''
  let q = (supabase.from('sitzungen') as R)
    .select(`id, datum, uhrzeit, ort, titel, nummer, notiz, status, zugriff_bis, eingeladen_am, zugriff_beendet_am, gremium:gremien!inner(id, schluessel, name, kurz, sortierung), protokolle(id, dateiname, groesse, typ, freigegeben, hochgeladen_am)${einl}`)
    .order('datum', { ascending: false })
  if (opts.gremium) q = q.eq('gremien.schluessel', opts.gremium)
  if (opts.jahr)    q = q.gte('datum', `${opts.jahr}-01-01`).lte('datum', `${opts.jahr}-12-31`)
  if (opts.limit)   q = q.limit(opts.limit)
  const { data } = await q
  return ((data ?? []) as R[]).map(s => ({
    ...s,
    protokolle: ((s.protokolle ?? []) as Protokoll[]).sort((a, b) => (TYP_RANG[a.typ] ?? 9) - (TYP_RANG[b.typ] ?? 9) || a.dateiname.localeCompare(b.dateiname)),
    einladungen: ((s.einladungen ?? []) as Einladung[]).sort((a, b) => `${a.profil?.nachname} ${a.profil?.vorname}`.localeCompare(`${b.profil?.nachname} ${b.profil?.vorname}`)),
  })) as Sitzung[]
}

export async function ladeJahre(): Promise<number[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('sitzungen').select('datum')
  const jahre = new Set(((data ?? []) as R[]).map(s => Number(String(s.datum).slice(0, 4))))
  return [...jahre].sort((a, b) => b - a)
}
