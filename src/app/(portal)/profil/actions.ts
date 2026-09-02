'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfil } from '@/lib/auth/roles'

export type ProfilState = { ok?: boolean; fehler?: string }

export async function profilSpeichernAction(_p: ProfilState, form: FormData): Promise<ProfilState> {
  const profil = await getProfil()
  if (!profil) return { fehler: 'Nicht angemeldet.' }
  const f = (k: string) => String(form.get(k) ?? '').trim()
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.from('profiles')
    .update({ vorname: f('vorname'), nachname: f('nachname'), funktion: f('funktion') || null, fraktion: f('fraktion') || null })
    .eq('id', profil.id)
  if (error) return { fehler: error.message }
  revalidatePath('/', 'layout')
  return { ok: true }
}
