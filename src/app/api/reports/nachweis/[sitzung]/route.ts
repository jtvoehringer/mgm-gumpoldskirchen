import { NextResponse, type NextRequest } from 'next/server'
import { getProfil, canUpload } from '@/lib/auth/roles'
import { ladeNachweis } from '@/lib/reports'
import { erzeugeTabellenPdf, erzeugeCsv } from '@/lib/pdf'
import { datumLang, zeit } from '@/lib/format'

/** Nachweisliste einer Sitzung (eingeladen / bestätigt / geöffnet) als CSV oder PDF */
export async function GET(request: NextRequest, { params }: { params: Promise<{ sitzung: string }> }) {
  const profil = await getProfil()
  if (!profil || !canUpload(profil.rolle)) return new NextResponse('Keine Berechtigung.', { status: 403 })
  const { sitzung } = await params
  const n = await ladeNachweis(sitzung)
  if (!n) return new NextResponse('Sitzung nicht gefunden.', { status: 404 })
  const s = n.sitzung
  const spalten = ['Mitglied', 'E-Mail', 'Einladung gesendet', 'Zugriff bestätigt', 'Erstes Öffnen', 'Hinweis']
  const zeilen = n.zeilen.map(z => [z.kontrolle ? `${z.mitglied} (Kontrollkopie Verwaltung)` : z.mitglied, z.email, z.gesendet, z.bestaetigt, z.geoeffnet, z.fehler ? `Mailfehler: ${z.fehler}` : ''])
  const name = `Nachweis_${String(s.datum)}_${String(s.gremien?.kurz ?? '')}`.replace(/[^A-Za-z0-9_.-]/g, '_')

  if (request.nextUrl.searchParams.get('format') === 'csv') {
    return new NextResponse(erzeugeCsv(spalten, zeilen), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"` } })
  }
  const mitgl = n.zeilen.filter(z => !z.kontrolle)
  const bestaetigt = mitgl.filter(z => z.bestaetigt !== '–').length, geoeffnet = mitgl.filter(z => z.geoeffnet !== '–').length
  const pdf = erzeugeTabellenPdf({
    titel: `Nachweis: ${s.titel}`,
    untertitel: `${s.gremien?.name ?? ''} · ${datumLang(String(s.datum))}${s.uhrzeit ? `, ${String(s.uhrzeit).slice(0, 5)} Uhr` : ''}${s.eingeladen_am ? ` · Einladung versendet am ${zeit(s.eingeladen_am)}` : ''}${s.zugriff_bis ? ` · Zugriff bis ${zeit(s.zugriff_bis)}` : ''}`,
    hinweis: `${mitgl.length} Mitglieder eingeladen · ${bestaetigt} bestätigt · ${geoeffnet} haben Unterlagen geöffnet (Kontrollkopien an die Verwaltung nicht mitgezählt)`,
    spalten: [{ label: 'Mitglied', breite: 150 }, { label: 'E-Mail', breite: 190 }, { label: 'Einladung gesendet', breite: 110 }, { label: 'Zugriff bestätigt', breite: 110 }, { label: 'Erstes Öffnen', breite: 110 }, { label: 'Hinweis', breite: 130 }],
    zeilen,
  })
  return new NextResponse(Buffer.from(pdf), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${name}.pdf"` } })
}
