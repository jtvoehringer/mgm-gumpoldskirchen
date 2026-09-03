'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfil, canAdmin } from '@/lib/auth/roles'

export type ProfilState = { ok?: boolean; fehler?: string }

/** Eigenes Passwort festlegen/ändern – nur Verwaltung/Superadmin (Mitglieder bleiben beim Einmal-Code) */
export async function passwortSetzenAction(_p: ProfilState, form: FormData): Promise<ProfilState> {
  const profil = await getProfil()
  if (!profil) return { fehler: 'Nicht angemeldet.' }
  if (!canAdmin(profil.rolle)) return { fehler: 'Passwort-Anmeldung ist nur für die Verwaltung vorgesehen.' }
  const pw = String(form.get('passwort') ?? ''), pw2 = String(form.get('passwort2') ?? '')
  if (pw.length < 10) return { fehler: 'Das Passwort muss mindestens 10 Zeichen lang sein.' }
  if (pw !== pw2) return { fehler: 'Die Passwörter stimmen nicht überein.' }
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({ password: pw })
  if (error) return { fehler: error.message }
  return { ok: true }
}

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
