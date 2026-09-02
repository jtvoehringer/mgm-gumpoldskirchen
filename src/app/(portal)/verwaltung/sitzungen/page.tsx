import { getProfil, canAdmin } from '@/lib/auth/roles'
import { ladeGremien, ladeSitzungen } from '@/lib/protokolle'
import { PageHeader } from '@/components/ui'
import SitzungenClient from './SitzungenClient'

export default async function SitzungenSeite() {
  const profil = (await getProfil())!
  const [gremien, sitzungen] = await Promise.all([ladeGremien(), ladeSitzungen()])
  return (
    <div>
      <PageHeader eyebrow="Verwaltung" titel="Sitzungen & Protokolle"
        beschreibung="Sitzung anlegen, PDF hochladen und freigeben. Erst freigegebene Dokumente sind für Mitglieder sichtbar." />
      <SitzungenClient gremien={gremien} sitzungen={sitzungen} darfLoeschen={canAdmin(profil.rolle)} />
    </div>
  )
}
