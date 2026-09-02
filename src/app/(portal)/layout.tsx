import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfil, ROLLEN_LABEL, anzeigename } from '@/lib/auth/roles'
import AppShell from '@/components/layout/AppShell'
import { ladeGremien } from '@/lib/protokolle'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profil = await getProfil()
  if (!profil) redirect('/auth/kein-zugang')

  // Letzten Login festhalten (höchstens alle 30 Minuten)
  const zuletzt = profil.letzter_login ? new Date(profil.letzter_login).getTime() : 0
  if (Date.now() - zuletzt > 30 * 60 * 1000) {
    await supabase.from('profiles').update({ letzter_login: new Date().toISOString() }).eq('id', profil.id)
  }

  // Navigation: Verwaltung/Schriftführung sehen alle aktiven Gremien, Mitglieder nur die eigenen
  const alle = await ladeGremien()
  const gremien = (profil.rolle === 'mitglied' ? alle.filter(g => profil.gremien.includes(g.schluessel)) : alle).map(g => ({ schluessel: g.schluessel, name: g.name }))

  return (
    <AppShell userName={anzeigename(profil)} userEmail={profil.email} rolle={profil.rolle} rolleLabel={ROLLEN_LABEL[profil.rolle]} gremien={gremien}>
      {children}
    </AppShell>
  )
}
