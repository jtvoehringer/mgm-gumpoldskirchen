import { getProfil, canAdmin } from '@/lib/auth/roles'
import { ladeGremien, ladeSitzungen } from '@/lib/protokolle'
import { PageHeader } from '@/components/ui'
import SitzungenClient from './SitzungenClient'

export default async function SitzungenSeite() {
  const profil = (await getProfil())!
  const [gremien, sitzungen] = await Promise.all([ladeGremien(), ladeSitzungen({ mitEinladungen: true })])
  return (
    <div>
      <PageHeader eyebrow="Verwaltung" titel="Sitzungen & Unterlagen"
        beschreibung="Sitzung anlegen, Unterlagen hochladen und freigeben, Einladung versenden. Mitglieder sehen die Unterlagen nach der Einladung bis 24:00 Uhr am Sitzungstag; jede Bestätigung und jeder Zugriff wird protokolliert." />
      <SitzungenClient gremien={gremien} sitzungen={sitzungen} darfLoeschen={canAdmin(profil.rolle)} />
    </div>
  )
}
