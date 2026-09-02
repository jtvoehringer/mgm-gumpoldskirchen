import { redirect } from 'next/navigation'
import { FileDown, FileSpreadsheet, Filter } from 'lucide-react'
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
  const gefiltert = Object.values(f).some(Boolean)

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
        beschreibung="Einladungen, Bestätigungen und Dokumentzugriffe – wer hat wann was getan. Nach Sitzung, Benutzer, Aktion oder Zeitraum filtern und als CSV oder PDF exportieren."
        aktion={<span className="flex gap-2">
          <a href={exportUrl('csv')} className="btn-secondary"><FileSpreadsheet size={15} /> CSV</a>
          <a href={exportUrl('pdf')} className="btn-primary"><FileDown size={15} /> PDF</a>
        </span>} />

      <form method="get" className="card mb-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2"><label className="form-label">Sitzung</label>
            <select name="sitzung" defaultValue={f.sitzung ?? ''} className="input">
              <option value="">Alle Sitzungen</option>
              {((sitzungen ?? []) as R[]).map(s => <option key={s.id} value={s.id}>{s.gremien?.kurz} · {datum(s.datum)} · {s.titel}</option>)}
            </select></div>
          <div><label className="form-label">Benutzer</label>
            <select name="benutzer" defaultValue={f.benutzer ?? ''} className="input">
              <option value="">Alle Benutzer</option>
              {((benutzer ?? []) as R[]).map(b => <option key={b.id} value={b.id}>{b.nachname} {b.vorname}</option>)}
            </select></div>
          <div><label className="form-label">Aktion</label>
            <select name="aktion" defaultValue={f.aktion ?? ''} className="input">
              <option value="">Alle Aktionen</option>
              {Object.entries(AKTION_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select></div>
          <div><label className="form-label">Von</label><input name="von" type="date" defaultValue={f.von ?? ''} className="input" /></div>
          <div><label className="form-label">Bis</label><input name="bis" type="date" defaultValue={f.bis ?? ''} className="input" /></div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button type="submit" className="btn-primary !py-1.5"><Filter size={14} /> Filtern</button>
          {gefiltert && <a href="/verwaltung/zugriffe" className="btn-secondary !py-1.5">Zurücksetzen</a>}
          <span className="ml-auto font-mono text-[12px] text-gk-text-2">{zeilen.length >= 500 ? 'mehr als 500 Einträge – Anzeige begrenzt, Export enthält alle' : `${zeilen.length} Einträge`}</span>
        </div>
      </form>

      <div className="card !p-0 overflow-x-auto">
        {zeilen.length === 0 ? <Leer text={gefiltert ? 'Keine Einträge für diese Auswahl.' : 'Noch keine Zugriffe protokolliert.'} /> : (
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
