import { redirect } from 'next/navigation'
import { getProfil, canAdmin } from '@/lib/auth/roles'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ladeGremien } from '@/lib/protokolle'
import { PageHeader } from '@/components/ui'
import GremienClient from './GremienClient'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

export default async function GremienSeite() {
  const profil = (await getProfil())!
  if (!canAdmin(profil.rolle)) redirect('/portal')
  const supabase = await createSupabaseServerClient()
  const [gremien, { data: sitz }, { data: mitgl }] = await Promise.all([
    ladeGremien({ alle: true }),
    supabase.from('sitzungen').select('gremium_id'),
    supabase.from('mitglied_gremien').select('gremium_id'),
  ])
  const zaehl = (rows: R[] | null) => (rows ?? []).reduce<Record<string, number>>((m, r) => { m[r.gremium_id] = (m[r.gremium_id] ?? 0) + 1; return m }, {})
  const sitzungen = zaehl(sitz as R[]), mitglieder = zaehl(mitgl as R[])
  return (
    <div>
      <PageHeader eyebrow="Verwaltung" titel="Gremien"
        beschreibung="Gemeinderat, Gemeindevorstand und Ausschüsse. Jedes Gremium ist ein eigener Berechtigungsbereich – Mitglieder sehen nur die Unterlagen ihrer Gremien." />
      <GremienClient gremien={gremien.map(g => ({ ...g, sitzungen: sitzungen[g.id] ?? 0, mitglieder: mitglieder[g.id] ?? 0 }))} />
    </div>
  )
}
