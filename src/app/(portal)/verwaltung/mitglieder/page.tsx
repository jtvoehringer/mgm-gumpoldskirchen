import { redirect } from 'next/navigation'
import { getProfil, canAdmin } from '@/lib/auth/roles'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ladeGremien } from '@/lib/protokolle'
import { PageHeader } from '@/components/ui'
import MitgliederClient from './MitgliederClient'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

export default async function MitgliederSeite() {
  const profil = (await getProfil())!
  if (!canAdmin(profil.rolle)) redirect('/portal')
  const supabase = await createSupabaseServerClient()
  const gremien = await ladeGremien()
  const { data } = await supabase.from('profiles')
    .select('id, email, vorname, nachname, funktion, fraktion, rolle, aktiv, erstellt_am, letzter_login, mitglied_gremien(gremien(schluessel))')
    .order('nachname').order('vorname')
  const mitglieder: R[] = ((data ?? []) as R[]).map(m => ({
    ...m, gremien: ((m.mitglied_gremien ?? []) as R[]).map(x => x.gremien?.schluessel).filter(Boolean) as string[],
  }))

  return (
    <div>
      <PageHeader eyebrow="Verwaltung" titel="Mitglieder & Benutzer"
        beschreibung={`${mitglieder.filter(m => m.aktiv).length} aktive Benutzer · Zugriff kann jederzeit entzogen werden.`} />
      <MitgliederClient mitglieder={mitglieder} gremien={gremien} ichId={profil.id} />
    </div>
  )
}
