import { redirect } from 'next/navigation'
import { getProfil, canAdmin } from '@/lib/auth/roles'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ladeGremien } from '@/lib/protokolle'
import { PageHeader, StatusBadge, Leer } from '@/components/ui'
import { zeit } from '@/lib/format'
import AntragKarte from './AntragKarte'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

export default async function AntraegeSeite({ searchParams }: { searchParams: Promise<{ alle?: string }> }) {
  const profil = (await getProfil())!
  if (!canAdmin(profil.rolle)) redirect('/portal')
  const sp = await searchParams
  const supabase = await createSupabaseServerClient()
  const gremien = await ladeGremien()

  const { data: offene } = await supabase.from('zugangsantraege').select('*').eq('status', 'offen').order('erstellt_am', { ascending: true })
  const { data: erledigt } = await supabase.from('zugangsantraege').select('*, entschieden:profiles!zugangsantraege_entschieden_von_fkey(vorname, nachname)')
    .neq('status', 'offen').order('entschieden_am', { ascending: false }).limit(sp.alle ? 500 : 20)

  return (
    <div>
      <PageHeader eyebrow="Verwaltung" titel="Zugangsanträge"
        beschreibung="Jeder Zugang wird hier persönlich geprüft und freigegeben – es gibt keine automatische Vergabe." />

      <section className="mb-8">
        <h2 className="font-display uppercase tracking-[.03em] text-[19px] mb-3">Offen <span className="font-mono text-[14px] text-gk-tertiary ml-1">{(offene ?? []).length}</span></h2>
        {(offene ?? []).length === 0 ? <div className="card"><Leer text="Keine offenen Anträge." /></div> : (
          <div className="grid lg:grid-cols-2 gap-4">
            {(offene as R[]).map(a => <AntragKarte key={a.id} antrag={a} gremien={gremien} />)}
          </div>
        )}
      </section>

      <section>
        <h2 className="font-display uppercase tracking-[.03em] text-[19px] mb-3">Entschieden</h2>
        <div className="card !p-0 overflow-x-auto">
          {(erledigt ?? []).length === 0 ? <Leer text="Noch keine entschiedenen Anträge." /> : (
            <table className="liste">
              <thead><tr><th>Antragsteller/in</th><th>Gremien</th><th>Status</th><th>Entschieden</th><th>Notiz</th></tr></thead>
              <tbody>
                {(erledigt as R[]).map(a => (
                  <tr key={a.id}>
                    <td><p className="font-semibold">{a.vorname} {a.nachname}</p><p className="text-[12.5px] text-gk-text-2">{a.funktion} · {a.email}</p></td>
                    <td className="text-[12.5px]">{(a.gremien as string[]).map(k => gremien.find(g => g.schluessel === k)?.kurz ?? k).join(', ')}</td>
                    <td><StatusBadge status={a.status} /></td>
                    <td className="text-[12.5px] whitespace-nowrap"><span className="font-mono">{zeit(a.entschieden_am)}</span><br /><span className="text-gk-text-2">{a.entschieden ? `${a.entschieden.vorname} ${a.entschieden.nachname}` : ''}</span></td>
                    <td className="text-[12.5px] text-gk-text-2 max-w-[260px]">{a.begruendung ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}
