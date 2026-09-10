import { redirect } from 'next/navigation'
import { FileDown, FileSpreadsheet } from 'lucide-react'
import FilterLeiste from './FilterLeiste'
import { getProfil, canAdmin } from '@/lib/auth/roles'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ladeZugriffe, AKTION_LABEL } from '@/lib/reports'
import { PageHeader, Leer } from '@/components/ui'
import { zeit, datum } from '@/lib/format'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

export default async function ZugriffeSeite({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const profil = (await getProfil())!
  if (!canAdmin(profil.rolle)) redirect('/portal')
  const sp = await searchParams
  const f = { sitzung: sp.sitzung || undefined, benutzer: sp.benutzer || undefined, aktion: sp.aktion || undefined, von: sp.von || undefined, bis: sp.bis || undefined }

  const supabase = await createSupabaseServerClient()
  const [zeilen, { data: sitzungen }, { data: benutzer }] = await Promise.all([
    ladeZugriffe({ ...f, limit: 500 }),
    (supabase.from('sitzungen') as R).select('id, titel, datum, gremien(kurz)').order('datum', { ascending: false }).limit(200),
    supabase.from('profiles').select('id, vorname, nachname').order('nachname').order('vorname'),
  ])
  const query = new URLSearchParams(Object.entries(f).filter(([, v]) => v) as [string, string][]).toString()
  const exportUrl = (format: 'csv' | 'pdf') => `/api/reports/zugriffe?${query}${query ? '&' : ''}format=${format}`

  return (
    <div>
      <PageHeader eyebrow="Verwaltung" titel="Zugriffsprotokoll"
        beschreibung="Einladungen, Bestätigungen und Dokumentzugriffe – wer hat wann was getan. Auswahl nach Sitzung, Benutzer, Aktion oder Zeitraum wirkt sofort; der Export als CSV oder PDF übernimmt die Auswahl."
        aktion={<span className="flex gap-2">
          <a href={exportUrl('csv')} className="btn-secondary"><FileSpreadsheet size={15} /> CSV</a>
          <a href={exportUrl('pdf')} className="btn-primary"><FileDown size={15} /> PDF</a>
        </span>} />

      <FilterLeiste werte={f} anzahl={zeilen.length} begrenzt={zeilen.length >= 500}
        sitzungen={((sitzungen ?? []) as R[]).map(s => ({ value: s.id, label: `${s.gremien?.kurz} · ${datum(s.datum)} · ${s.titel}` }))}
        benutzer={((benutzer ?? []) as R[]).map(b => ({ value: b.id, label: `${b.nachname} ${b.vorname}` }))}
        aktionen={Object.entries(AKTION_LABEL).map(([value, label]) => ({ value, label }))} />

      <div className="card !p-0 overflow-x-auto">
        {zeilen.length === 0 ? <Leer text={Object.values(f).some(Boolean) ? 'Keine Einträge für diese Auswahl.' : 'Noch keine Zugriffe protokolliert.'} /> : (
          <table className="liste">
            <thead><tr><th>Zeitpunkt</th><th>Benutzer</th><th>Aktion</th><th>Dokument</th><th>Sitzung</th></tr></thead>
            <tbody>
              {zeilen.map(z => (
                <tr key={z.id}>
                  <td className="font-mono text-[12px] whitespace-nowrap">{zeit(z.zeitpunkt)}</td>
                  <td>{z.benutzer}<br /><span className="text-[12px] text-gk-text-2">{z.email}</span></td>
                  <td><span className="badge bg-gk-bg text-gk-text-1">{z.aktion}</span></td>
                  <td className="text-[13px]">{z.dokument || <span className="text-gk-tertiary">–</span>}</td>
                  <td className="text-[12.5px] text-gk-text-2">{z.sitzung}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
