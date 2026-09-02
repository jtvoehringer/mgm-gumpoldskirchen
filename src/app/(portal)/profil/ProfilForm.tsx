'use client'

import { useActionState } from 'react'
import { profilSpeichernAction, type ProfilState } from './actions'

export default function ProfilForm({ profil }: { profil: { vorname: string; nachname: string; funktion: string; fraktion: string } }) {
  const [state, action, pending] = useActionState<ProfilState, FormData>(profilSpeichernAction, {})
  return (
    <form action={action} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="form-label">Vorname</label><input name="vorname" defaultValue={profil.vorname} className="input" required /></div>
        <div><label className="form-label">Nachname</label><input name="nachname" defaultValue={profil.nachname} className="input" required /></div>
        <div><label className="form-label">Funktion</label><input name="funktion" defaultValue={profil.funktion} className="input" /></div>
        <div><label className="form-label">Fraktion</label><input name="fraktion" defaultValue={profil.fraktion} className="input" /></div>
      </div>
      {state.fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{state.fehler}</p>}
      {state.ok && <p className="text-[13px] text-gk-ok-fg bg-gk-ok-bg rounded-lg px-3 py-2">Gespeichert.</p>}
      <button className="btn-primary" disabled={pending}>Speichern</button>
    </form>
  )
}
