import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FileText } from 'lucide-react'
import { getProfil } from '@/lib/auth/roles'
import { ladeGremien, ladeSitzungen, ladeJahre } from '@/lib/protokolle'
import { datum, datumLang } from '@/lib/format'
import { PageHeader, Leer } from '@/components/ui'
import ProtokollLink from '@/components/ProtokollLink'

export default async function ProtokolleGremium({ params, searchParams }: {
  params: Promise<{ gremium: string }>; searchParams: Promise<{ jahr?: string }>
}) {
  const { gremium: key } = await params
  const sp = await searchParams
  const profil = (await getProfil())!
  const gremien = await ladeGremien()
  const gremium = gremien.find(g => g.schluessel === key)
  if (!gremium) notFound()

  const darf = profil.rolle !== 'mitglied' || profil.gremien.includes(key)
  const jahre = darf ? await ladeJahre() : []
  const jahr = sp.jahr ? Number(sp.jahr) : undefined
  const sitzungen = darf ? await ladeSitzungen({ gremium: key, jahr }) : []

  return (
    <div>
      <PageHeader eyebrow="Protokolle" titel={gremium.name}
        beschreibung={darf ? `${sitzungen.length} Sitzungen${jahr ? ` im Jahr ${jahr}` : ''}` : undefined} />

      {!darf ? (
        <div className="card">
          <Leer text={`Sie haben keinen Zugriff auf die Protokolle des Gremiums „${gremium.name}". Bei Bedarf kann die Gemeindeverwaltung den Zugang erweitern.`} />
        </div>
      ) : (
        <>
          {jahre.length > 1 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              <Link href={`/protokolle/${key}`} className={`px-3 py-1.5 rounded-md text-[13px] border ${!jahr ? 'bg-gk-blau text-white border-gk-blau' : 'bg-white border-gk-line-str hover:border-gk-blau'}`}>Alle Jahre</Link>
              {jahre.map(j => (
                <Link key={j} href={`/protokolle/${key}?jahr=${j}`} className={`px-3 py-1.5 rounded-md text-[13px] font-mono border ${jahr === j ? 'bg-gk-blau text-white border-gk-blau' : 'bg-white border-gk-line-str hover:border-gk-blau'}`}>{j}</Link>
              ))}
            </div>
          )}

          {sitzungen.length === 0 ? <div className="card"><Leer text="Für diese Auswahl sind noch keine Protokolle verfügbar." /></div> : (
            <div className="card !p-0 overflow-hidden">
              <table className="liste">
                <thead><tr><th className="w-28">Datum</th><th>Sitzung</th><th>Dokumente</th></tr></thead>
                <tbody>
                  {sitzungen.map(s => (
                    <tr key={s.id} className="hover:bg-gk-bg/60">
                      <td className="font-mono text-[12.5px] text-gk-text-1 whitespace-nowrap" title={datumLang(s.datum)}>{datum(s.datum)}</td>
                      <td>
                        <p className="font-semibold text-gk-text flex items-center gap-2"><FileText size={15} className="text-gk-blau shrink-0" strokeWidth={1.75} />{s.titel}</p>
                        {s.notiz && <p className="text-[12.5px] text-gk-text-2 mt-0.5">{s.notiz}</p>}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1.5">
                          {s.protokolle.length === 0 && <span className="text-[12.5px] text-gk-tertiary">Protokoll folgt</span>}
                          {s.protokolle.map(p => <ProtokollLink key={p.id} protokoll={p} />)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
