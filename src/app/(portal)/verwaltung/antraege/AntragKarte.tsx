'use client'

import { useActionState } from 'react'
import { Check, X, Mail, Phone } from 'lucide-react'
import { antragEntscheidenAction, type AktionState } from '../actions'
import { zeit } from '@/lib/format'
import type { Gremium } from '@/lib/protokolle'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

export default function AntragKarte({ antrag: a, gremien }: { antrag: R; gremien: Gremium[] }) {
  const [state, action, pending] = useActionState<AktionState, FormData>(antragEntscheidenAction, {})

  return (
    <form action={action} className="card border-l-4 border-l-gk-gruen">
      <input type="hidden" name="id" value={a.id} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[16px] font-semibold text-gk-text">{a.vorname} {a.nachname}</p>
          <p className="text-[13px] text-gk-text-1">{a.funktion}{a.fraktion ? ` · ${a.fraktion}` : ''}</p>
        </div>
        <span className="font-mono text-[11px] text-gk-tertiary whitespace-nowrap">{zeit(a.erstellt_am)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-gk-text-1">
        <span className="inline-flex items-center gap-1.5"><Mail size={14} className="text-gk-tertiary" /> {a.email}</span>
        {a.telefon && <span className="inline-flex items-center gap-1.5"><Phone size={14} className="text-gk-tertiary" /> {a.telefon}</span>}
      </div>
      {a.nachricht && <p className="mt-3 text-[13px] text-gk-text-1 bg-gk-bg rounded-lg px-3 py-2 whitespace-pre-line">{a.nachricht}</p>}

      <fieldset className="mt-4">
        <legend className="form-label">Zugang freigeben für</legend>
        <div className="flex flex-wrap gap-2 mt-1">
          {gremien.map(g => (
            <label key={g.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gk-line-str bg-white text-[13px] cursor-pointer has-[:checked]:border-gk-blau has-[:checked]:bg-gk-blau-50">
              <input type="checkbox" name="gremien" value={g.schluessel} defaultChecked={(a.gremien as string[]).includes(g.schluessel)} className="accent-gk-blau" /> {g.name}
            </label>
          ))}
        </div>
        <p className="mt-1 text-[12px] text-gk-text-2">Beantragt: {(a.gremien as string[]).map(k => gremien.find(g => g.schluessel === k)?.name ?? k).join(', ')}</p>
      </fieldset>

      <div className="mt-3">
        <label className="form-label">Interne Notiz / Begründung (bei Ablehnung wird sie mitgeteilt)</label>
        <input name="begruendung" className="input" placeholder="z. B. Mandat lt. Konstituierung 2025 geprüft" />
      </div>

      {state.fehler && <p className="mt-3 text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{state.fehler}</p>}
      {state.ok && <p className="mt-3 text-[13px] text-gk-ok-fg bg-gk-ok-bg rounded-lg px-3 py-2">{state.info}</p>}

      {!state.ok && (
        <div className="mt-4 flex flex-wrap gap-2 justify-end">
          <button type="submit" name="entscheidung" value="ablehnen" disabled={pending} className="btn-danger"><X size={15} /> Ablehnen</button>
          <button type="submit" name="entscheidung" value="genehmigen" disabled={pending} className="btn-primary"><Check size={15} /> {pending ? 'Bitte warten …' : 'Freigeben & einladen'}</button>
        </div>
      )}
    </form>
  )
}
