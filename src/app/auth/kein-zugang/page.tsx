import PublicShell from '@/components/layout/PublicShell'
import { ShieldOff } from 'lucide-react'

/** Angemeldet, aber kein aktives Profil (Zugang entzogen oder noch nicht freigegeben) */
export default function KeinZugang() {
  return (
    <PublicShell>
      <div className="card text-center py-10">
        <span className="inline-flex w-14 h-14 rounded-full bg-gk-wein-bg text-gk-wein items-center justify-center"><ShieldOff size={28} strokeWidth={1.5} /></span>
        <h1 className="headline text-[30px] mt-5">Kein aktiver Zugang</h1>
        <p className="mt-3 text-[14.5px] text-gk-text-1 max-w-md mx-auto leading-relaxed">
          Für Ihre Anmeldung ist derzeit kein freigegebener Zugang hinterlegt. Bitte wenden Sie sich an die Gemeindeverwaltung.
        </p>
        <form action="/auth/abmelden" method="post" className="mt-7"><button className="btn-secondary">Abmelden</button></form>
      </div>
    </PublicShell>
  )
}
