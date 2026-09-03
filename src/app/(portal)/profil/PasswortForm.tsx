'use client'

import { useActionState } from 'react'
import { LockKeyhole } from 'lucide-react'
import { passwortSetzenAction, type ProfilState } from './actions'

/** Passwort für die Anmeldung ohne Einmal-Code (Verwaltung/Superadmin) */
export default function PasswortForm() {
  const [state, action, pending] = useActionState<ProfilState, FormData>(passwortSetzenAction, {})
  return (
    <form action={action} className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div><label className="form-label">Neues Passwort (mind. 10 Zeichen)</label><input name="passwort" type="password" required minLength={10} autoComplete="new-password" className="input" /></div>
        <div><label className="form-label">Passwort wiederholen</label><input name="passwort2" type="password" required minLength={10} autoComplete="new-password" className="input" /></div>
      </div>
      {state.fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{state.fehler}</p>}
      {state.ok && <p className="text-[13px] text-gk-ok-fg bg-gk-ok-bg rounded-lg px-3 py-2">Passwort gespeichert – ab jetzt „Anmeldung mit Passwort" auf der Anmeldeseite.</p>}
      <div className="flex justify-end"><button type="submit" disabled={pending} className="btn-primary"><LockKeyhole size={15} /> Passwort speichern</button></div>
    </form>
  )
}
