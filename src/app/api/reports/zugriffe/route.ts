import { NextResponse, type NextRequest } from 'next/server'
import { getProfil, canAdmin } from '@/lib/auth/roles'
import { ladeZugriffe, zugriffeAlsTabelle } from '@/lib/reports'
import { erzeugeTabellenPdf, erzeugeCsv } from '@/lib/pdf'
import { createSupabaseServerClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

/** Export des Zugriffsprotokolls als CSV oder PDF – Filter wie auf der Seite (sitzung, benutzer, aktion, von, bis) */
export async function GET(request: NextRequest) {
  const profil = await getProfil()
  if (!profil || !canAdmin(profil.rolle)) return new NextResponse('Keine Berechtigung.', { status: 403 })
  const sp = request.nextUrl.searchParams
  const f = { sitzung: sp.get('sitzung') || undefined, benutzer: sp.get('benutzer') || undefined, aktion: sp.get('aktion') || undefined, von: sp.get('von') || undefined, bis: sp.get('bis') || undefined }
  const zeilen = await ladeZugriffe(f)
  const t = zugriffeAlsTabelle(zeilen)
  const stempel = new Date().toISOString().slice(0, 10)

  if (sp.get('format') === 'csv') {
    return new NextResponse(erzeugeCsv(t.spalten, t.zeilen), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="Zugriffsprotokoll_${stempel}.csv"` },
    })
  }

  // Untertitel aus den Filtern
  const supabase = await createSupabaseServerClient()
  const teile: string[] = []
  if (f.sitzung) { const { data } = await (supabase.from('sitzungen') as R).select('titel, datum, gremien(kurz)').eq('id', f.sitzung).maybeSingle(); if (data) teile.push(`Sitzung: ${data.gremien?.kurz} · ${data.titel}`) }
  if (f.benutzer) { const { data } = await supabase.from('profiles').select('vorname, nachname').eq('id', f.benutzer).maybeSingle(); if (data) teile.push(`Benutzer: ${(data as R).vorname} ${(data as R).nachname}`) }
  if (f.aktion) teile.push(`Aktion: ${f.aktion}`)
  if (f.von || f.bis) teile.push(`Zeitraum: ${f.von ?? '…'} bis ${f.bis ?? '…'}`)
  const pdf = erzeugeTabellenPdf({
    titel: 'Zugriffsprotokoll', untertitel: teile.join(' · ') || 'Alle Einträge',
    hinweis: 'Protokollierte Ereignisse: Einladung gesendet, Zugriff bestätigt, Ansicht/Download von Dokumenten, Anmeldung, Zugriff beendet. Zeiten in Wiener Zeit.',
    spalten: t.spalten.map((label, i) => ({ label, breite: t.breiten[i] })), zeilen: t.zeilen,
  })
  return new NextResponse(Buffer.from(pdf), {
    headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="Zugriffsprotokoll_${stempel}.pdf"` },
  })
}
