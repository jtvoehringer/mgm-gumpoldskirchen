import 'server-only'
import { cache } from 'react'
import { createSupabaseServerClient } from '@/lib/supabase/server'

import { type Rolle } from './rollen'
export * from './rollen'

export type Profil = {
  id: string
  email: string
  vorname: string
  nachname: string
  funktion: string | null
  fraktion: string | null
  rolle: Rolle
  aktiv: boolean
  letzter_login: string | null
  gremien: string[]   // Schlüssel der Gremien, auf die das Mitglied Zugriff hat
}

/** Profil des angemeldeten Benutzers (pro Request gecacht). null = nicht angemeldet oder deaktiviert. */
export const getProfil = cache(async (): Promise<Profil | null> => {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase.from('profiles') as any)
    .select('id, email, vorname, nachname, funktion, fraktion, rolle, aktiv, letzter_login, mitglied_gremien(gremien(schluessel))')
    .eq('id', user.id).maybeSingle()
  if (!data || !data.aktiv) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gremien = ((data.mitglied_gremien ?? []) as any[]).map(m => m.gremien?.schluessel).filter(Boolean)
  return { ...data, gremien } as Profil
})

