'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Send } from 'lucide-react'
import { antragSendenAction, type AntragState } from './actions'

const GREMIEN = [
  { key: 'gemeinderat',      label: 'Gemeinderat' },
  { key: 'gemeindevorstand', label: 'Gemeindevorstand' },
]

export default function AntragForm() {
  const router = useRouter()
  const [state, action, pending] = useActionState<AntragState, FormData>(antragSendenAction, { ok: false })
  useEffect(() => { if (state.ok) router.push('/antrag/gesendet') }, [state.ok, router])

  return (
    <form action={action} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div><label className="form-label" htmlFor="vorname">Vorname *</label><input id="vorname" name="vorname" required className="input" autoComplete="given-name" /></div>
        <div><label className="form-label" htmlFor="nachname">Nachname *</label><input id="nachname" name="nachname" required className="input" autoComplete="family-name" /></div>
        <div><label className="form-label" htmlFor="email">E-Mail-Adresse *</label><input id="email" name="email" type="email" required className="input" autoComplete="email" placeholder="name@beispiel.at" /></div>
        <div><label className="form-label" htmlFor="telefon">Telefon</label><input id="telefon" name="telefon" className="input" autoComplete="tel" /></div>
        <div><label className="form-label" htmlFor="funktion">Funktion *</label>
          <input id="funktion" name="funktion" required className="input" placeholder="z. B. Gemeinderätin, Vizebürgermeister" /></div>
        <div><label className="form-label" htmlFor="fraktion">Fraktion</label><input id="fraktion" name="fraktion" className="input" /></div>
      </div>

      <fieldset>
        <legend className="form-label">Zugang gewünscht für *</legend>
        <div className="flex flex-wrap gap-3 mt-1">
          {GREMIEN.map(g => (
            <label key={g.key} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gk-line-str bg-white text-[13.5px] cursor-pointer has-[:checked]:border-gk-blau has-[:checked]:bg-gk-blau-50">
              <input type="checkbox" name="gremien" value={g.key} className="accent-gk-blau" /> {g.label}
            </label>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-gk-text-2">Die Verwaltung prüft, ob ein aktives Mandat im jeweiligen Gremium besteht.</p>
      </fieldset>

      <div><label className="form-label" htmlFor="nachricht">Anmerkung</label>
        <textarea id="nachricht" name="nachricht" rows={3} className="input" placeholder="Optional – z. B. seit wann Sie dem Gremium angehören" /></div>

      <label className="flex items-start gap-2.5 text-[13px] text-gk-text-1">
        <input type="checkbox" name="datenschutz" value="1" required className="mt-0.5 accent-gk-blau" />
        <span>Ich bin damit einverstanden, dass meine Angaben zur Prüfung und Verwaltung des Zugangs gespeichert werden. Zugriffe auf Protokolle werden protokolliert.</span>
      </label>

      {state.fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{state.fehler}</p>}

      <div className="flex items-center justify-between gap-3 pt-1">
        <p className="text-[12px] text-gk-text-2">* Pflichtfeld</p>
        <button type="submit" disabled={pending} className="btn-primary"><Send size={15} /> {pending ? 'Wird gesendet …' : 'Antrag senden'}</button>
      </div>
    </form>
  )
}
