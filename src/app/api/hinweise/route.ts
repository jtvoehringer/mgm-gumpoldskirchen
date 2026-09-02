import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfil } from '@/lib/auth/roles'

/** Anzahl offener Zugangsanträge (Glocke in der Kopfleiste, nur Verwaltung) */
export async function GET() {
  const profil = await getProfil()
  if (!profil || profil.rolle !== 'verwaltung') return NextResponse.json({ offeneAntraege: 0 })
  const supabase = await createSupabaseServerClient()
  const { count } = await supabase.from('zugangsantraege').select('id', { count: 'exact', head: true }).eq('status', 'offen')
  return NextResponse.json({ offeneAntraege: count ?? 0 })
}
