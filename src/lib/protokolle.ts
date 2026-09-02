import 'server-only'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

export type Gremium = { id: string; schluessel: string; name: string; kurz: string; sortierung: number }
export type Protokoll = { id: string; dateiname: string; groesse: number | null; typ: string; freigegeben: boolean; hochgeladen_am: string }
export type Sitzung = { id: string; datum: string; titel: string; nummer: number | null; notiz: string | null; gremium: Gremium; protokolle: Protokoll[] }

export async function ladeGremien(): Promise<Gremium[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('gremien').select('*').order('sortierung')
  return (data ?? []) as Gremium[]
}

/** Sitzungen inkl. Protokolle – RLS filtert bereits nach Gremiums-Berechtigung und Freigabe */
export async function ladeSitzungen(opts: { gremium?: string; jahr?: number; limit?: number } = {}): Promise<Sitzung[]> {
  const supabase = await createSupabaseServerClient()
  let q = (supabase.from('sitzungen') as R)
    .select('id, datum, titel, nummer, notiz, gremium:gremien!inner(id, schluessel, name, kurz, sortierung), protokolle(id, dateiname, groesse, typ, freigegeben, hochgeladen_am)')
    .order('datum', { ascending: false })
  if (opts.gremium) q = q.eq('gremien.schluessel', opts.gremium)
  if (opts.jahr)    q = q.gte('datum', `${opts.jahr}-01-01`).lte('datum', `${opts.jahr}-12-31`)
  if (opts.limit)   q = q.limit(opts.limit)
  const { data } = await q
  return ((data ?? []) as R[]).map(s => ({
    ...s,
    protokolle: ((s.protokolle ?? []) as Protokoll[]).sort((a, b) => a.typ.localeCompare(b.typ) || a.dateiname.localeCompare(b.dateiname)),
  })) as Sitzung[]
}

export async function ladeJahre(): Promise<number[]> {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('sitzungen').select('datum')
  const jahre = new Set(((data ?? []) as R[]).map(s => Number(String(s.datum).slice(0, 4))))
  return [...jahre].sort((a, b) => b - a)
}
