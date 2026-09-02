import { redirect } from 'next/navigation'
import { getProfil } from '@/lib/auth/roles'

/** Einstieg: Mitglieder mit nur einem Gremium direkt dorthin, sonst Gemeinderat */
export default async function ProtokolleEinstieg() {
  const profil = (await getProfil())!
  const ziel = profil.rolle === 'mitglied' && profil.gremien.length === 1 ? profil.gremien[0] : 'gemeinderat'
  redirect(`/protokolle/${ziel}`)
}
