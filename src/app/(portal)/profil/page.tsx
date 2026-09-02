import { getProfil, ROLLEN_LABEL } from '@/lib/auth/roles'
import { ladeGremien } from '@/lib/protokolle'
import { PageHeader } from '@/components/ui'
import ProfilForm from './ProfilForm'

export default async function ProfilSeite() {
  const profil = (await getProfil())!
  const gremien = await ladeGremien()
  return (
    <div className="max-w-2xl">
      <PageHeader eyebrow="Mein Konto" titel="Profil" />
      <div className="card">
        <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-[13.5px] mb-6">
          <div><dt className="eyebrow">E-Mail</dt><dd className="mt-1">{profil.email}</dd></div>
          <div><dt className="eyebrow">Rolle</dt><dd className="mt-1">{ROLLEN_LABEL[profil.rolle]}</dd></div>
          <div className="sm:col-span-2"><dt className="eyebrow">Zugriff auf</dt>
            <dd className="mt-1">{profil.rolle === 'mitglied' ? gremien.filter(g => profil.gremien.includes(g.schluessel)).map(g => g.name).join(', ') || '–' : 'alle Gremien'}</dd></div>
        </dl>
        <ProfilForm profil={{ vorname: profil.vorname, nachname: profil.nachname, funktion: profil.funktion ?? '', fraktion: profil.fraktion ?? '' }} />
      </div>
    </div>
  )
}
