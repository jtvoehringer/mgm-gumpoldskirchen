import Link from 'next/link'
import { FileText, Users, Upload } from 'lucide-react'
import { getProfil } from '@/lib/auth/roles'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ladeSitzungen, ladeGremien } from '@/lib/protokolle'
import { datum, datumLang } from '@/lib/format'
import { Kpi, PageHeader, Leer } from '@/components/ui'
import ProtokollLink from '@/components/ProtokollLink'

export default async function Uebersicht() {
  const profil = (await getProfil())!
  const supabase = await createSupabaseServerClient()
  const [sitzungen, gremien] = await Promise.all([ladeSitzungen({ limit: 8 }), ladeGremien()])

  // Zähler je Gremium (freigegebene Protokolle, RLS-gefiltert)
  const alle = await ladeSitzungen()
  const proGremium = gremien.map(g => ({
    g, sitzungen: alle.filter(s => s.gremium.id === g.id).length,
    protokolle: alle.filter(s => s.gremium.id === g.id).reduce((n, s) => n + s.protokolle.filter(p => p.freigegeben).length, 0),
  })).filter(x => profil.rolle !== 'mitglied' || profil.gremien.includes(x.g.schluessel))

  let mitglieder = 0
  if (profil.rolle === 'verwaltung') {
    const { count: m } = await supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('aktiv', true).eq('rolle', 'mitglied')
    mitglieder = m ?? 0
  }

  const heute = new Date()
  const gruss = heute.getHours() < 11 ? 'Guten Morgen' : heute.getHours() < 18 ? 'Guten Tag' : 'Guten Abend'

  return (
    <div>
      <PageHeader eyebrow={datumLang(heute)} titel={`${gruss}, ${profil.vorname || profil.nachname}`}
        beschreibung={profil.rolle === 'mitglied'
          ? `Sie haben Zugriff auf die Sitzungsunterlagen: ${gremien.filter(g => profil.gremien.includes(g.schluessel)).map(g => g.name).join(', ') || '–'}`
          : 'Übersicht über Sitzungen, Unterlagen und Mitglieder.'} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {proGremium.map(x => (
          <Kpi key={x.g.id} label={x.g.name} wert={x.protokolle} hinweis={`${x.sitzungen} Sitzungen`} href={`/protokolle/${x.g.schluessel}`} />
        ))}
        {profil.rolle === 'verwaltung' && <>
          <Kpi label="Aktive Mitglieder" wert={mitglieder} hinweis="mit Lesezugriff" href="/verwaltung/mitglieder" />
        </>}
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mt-6">
        <section className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display uppercase tracking-[.03em] text-[19px]">Aktuelle Sitzungsunterlagen</h2>
            <Link href="/protokolle" className="text-[13px] text-gk-blau font-medium hover:underline">Alle anzeigen</Link>
          </div>
          {sitzungen.length === 0 ? <Leer text={profil.rolle === 'mitglied' ? 'Derzeit sind keine Unterlagen freigeschaltet. Sie erhalten vor jeder Sitzung eine Einladung per E-Mail.' : 'Noch keine Sitzungen vorhanden.'} /> : (
            <ul className="divide-y divide-gk-line">
              {sitzungen.map(s => (
                <li key={s.id} className="py-3 flex items-start gap-3">
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-gk-blau-50 text-gk-blau flex items-center justify-center"><FileText size={17} strokeWidth={1.75} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-semibold text-gk-text truncate">{s.titel}</p>
                    <p className="text-[12.5px] text-gk-text-2"><span className="font-mono">{datum(s.datum)}</span> · {s.gremium.name}</p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {s.protokolle.map(p => <ProtokollLink key={p.id} protokoll={p} klein />)}
                      {s.protokolle.length === 0 && <span className="text-[12px] text-gk-tertiary">Unterlagen folgen</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          {profil.rolle === 'verwaltung' && (
            <section className="card">
              <h2 className="font-display uppercase tracking-[.03em] text-[19px] mb-3">Verwaltung</h2>
              <ul className="space-y-1.5 text-[13.5px]">
                <li><Link href="/verwaltung/sitzungen" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gk-bg"><Upload size={15} className="text-gk-blau" /> Sitzung anlegen & Unterlagen hochladen</Link></li>
                <li><Link href="/verwaltung/mitglieder" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gk-bg"><Users size={15} className="text-gk-blau" /> Mitglieder verwalten</Link></li>
              </ul>
            </section>
          )}
          {profil.rolle === 'schriftfuehrung' && (
            <section className="card">
              <h2 className="font-display uppercase tracking-[.03em] text-[19px] mb-3">Schriftführung</h2>
              <Link href="/verwaltung/sitzungen" className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-gk-bg text-[13.5px]"><Upload size={15} className="text-gk-blau" /> Sitzung anlegen & Protokoll hochladen</Link>
            </section>
          )}
          <section className="rounded-xl border border-gk-line bg-gk-blau text-white p-5 relative overflow-hidden">
            <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gk-gruen" />
            <p className="eyebrow !text-white/60">Hinweis</p>
            <p className="mt-2 text-[13.5px] leading-relaxed text-white/90">
              Die Sitzungsunterlagen sind ausschließlich für Mitglieder des jeweiligen Gremiums bestimmt. Bitte geben Sie Dokumente nicht weiter.
              Jeder Aufruf wird protokolliert.
            </p>
          </section>
        </aside>
      </div>
    </div>
  )
}
