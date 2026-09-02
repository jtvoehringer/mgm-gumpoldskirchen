import { redirect } from 'next/navigation'
import { getProfil, canAdmin } from '@/lib/auth/roles'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { PageHeader, Leer } from '@/components/ui'
import { zeit } from '@/lib/format'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

const AKTION: Record<string, string> = { ansicht: 'Ansicht', download: 'Download', login: 'Anmeldung', einladung: 'Einladung gesendet', bestaetigung: 'Zugriff bestätigt', zugriff_beendet: 'Zugriff beendet' }

export default async function ZugriffeSeite() {
  const profil = (await getProfil())!
  if (!canAdmin(profil.rolle)) redirect('/portal')
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('zugriffs_log')
    .select('id, aktion, zeitpunkt, profiles(vorname, nachname, email), protokolle(dateiname), sitzungen(titel, datum, gremien(kurz))')
    .order('zeitpunkt', { ascending: false }).limit(300)
  const zeilen = (data ?? []) as R[]

  return (
    <div>
      <PageHeader eyebrow="Verwaltung" titel="Zugriffsprotokoll" beschreibung="Die letzten 300 Ereignisse – Einladungen, Bestätigungen und Dokumentzugriffe: wer hat wann was getan." />
      <div className="card !p-0 overflow-x-auto">
        {zeilen.length === 0 ? <Leer text="Noch keine Zugriffe protokolliert." /> : (
          <table className="liste">
            <thead><tr><th>Zeitpunkt</th><th>Benutzer</th><th>Aktion</th><th>Dokument</th><th>Sitzung</th></tr></thead>
            <tbody>
              {zeilen.map(z => (
                <tr key={z.id}>
                  <td className="font-mono text-[12px] whitespace-nowrap">{zeit(z.zeitpunkt)}</td>
                  <td>{z.profiles ? `${z.profiles.vorname} ${z.profiles.nachname}` : <span className="text-gk-tertiary">gelöscht</span>}<br /><span className="text-[12px] text-gk-text-2">{z.profiles?.email}</span></td>
                  <td><span className="badge bg-gk-bg text-gk-text-1">{AKTION[z.aktion] ?? z.aktion}</span></td>
                  <td className="text-[13px]">{z.protokolle?.dateiname ?? <span className="text-gk-tertiary">–</span>}</td>
                  <td className="text-[12.5px] text-gk-text-2">{z.sitzungen ? `${z.sitzungen.gremien?.kurz} · ${z.sitzungen.titel}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
