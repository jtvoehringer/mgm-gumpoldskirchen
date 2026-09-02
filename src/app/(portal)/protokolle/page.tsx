import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getProfil } from '@/lib/auth/roles'
import { ladeGremien } from '@/lib/protokolle'
import { PageHeader, Leer } from '@/components/ui'

/** Einstieg: Mitglieder mit nur einem Gremium direkt dorthin, sonst Übersicht der Gremien */
export default async function ProtokolleEinstieg() {
  const profil = (await getProfil())!
  if (profil.rolle === 'mitglied' && profil.gremien.length === 1) redirect(`/protokolle/${profil.gremien[0]}`)
  const gremien = await ladeGremien()
  const meine = profil.rolle === 'mitglied' ? gremien.filter(g => profil.gremien.includes(g.schluessel)) : gremien
  return (
    <div>
      <PageHeader eyebrow="Sitzungsunterlagen" titel="Gremien" beschreibung={profil.rolle === 'mitglied' ? 'Ihre Gremien – bitte auswählen.' : 'Alle aktiven Gremien.'} />
      {meine.length === 0 ? <div className="card"><Leer text="Ihnen ist derzeit kein Gremium zugeordnet." /></div> : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meine.map(g => (
            <Link key={g.id} href={`/protokolle/${g.schluessel}`} className="card hover:border-gk-blau-100 transition-colors flex items-center gap-3">
              <span className="badge bg-gk-blau-50 text-gk-blau">{g.kurz}</span>
              <span className="font-semibold text-gk-text">{g.name}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
