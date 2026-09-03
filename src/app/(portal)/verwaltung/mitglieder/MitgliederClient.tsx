'use client'

import { useActionState, useState, useTransition } from 'react'
import { UserPlus, Ban, RotateCcw, Send, Pencil, Check, X, ShieldCheck, ShieldOff, LifeBuoy } from 'lucide-react'
import { mitgliedAnlegenAction, mitgliedAendernAction, type AktionState } from '../actions'
import { ROLLEN_LABEL, type Rolle } from '@/lib/auth/rollen'
import { StatusBadge, Leer } from '@/components/ui'
import { datum } from '@/lib/format'
import type { Gremium } from '@/lib/protokolle'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>

export default function MitgliederClient({ mitglieder, gremien, ichId, ichRolle }: { mitglieder: R[]; gremien: Gremium[]; ichId: string; ichRolle: Rolle }) {
  const binSuperadmin = ichRolle === 'superadmin'
  const rollenAuswahl = (Object.keys(ROLLEN_LABEL) as Rolle[]).filter(r => r !== 'superadmin' || binSuperadmin)
  const [neuOffen, setNeuOffen] = useState(false)
  const [filter, setFilter] = useState('')
  const [neuState, neuAction, neuPending] = useActionState<AktionState, FormData>(mitgliedAnlegenAction, {})
  const [meldung, setMeldung] = useState<AktionState>({})
  const [bearbeite, setBearbeite] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const aendern = (fd: FormData) => start(async () => { const r = await mitgliedAendernAction({}, fd); setMeldung(r); if (r.ok && fd.get('was') === 'bearbeiten') setBearbeite(null) })
  const f = filter.toLowerCase()
  const liste = mitglieder.filter(m => !f || `${m.vorname} ${m.nachname} ${m.email} ${m.funktion ?? ''} ${m.fraktion ?? ''}`.toLowerCase().includes(f))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Suchen …" className="input max-w-xs" />
        <button onClick={() => setNeuOffen(o => !o)} className="btn-primary ml-auto"><UserPlus size={15} /> Benutzer anlegen</button>
      </div>

      {neuOffen && (
        <form action={neuAction} className="card border-l-4 border-l-gk-gruen space-y-4">
          <p className="text-[14px] font-semibold">Benutzer anlegen – es wird keine E-Mail versendet. Den Anmelde-Link bei Bedarf über das Senden-Symbol in der Liste verschicken.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <div><label className="form-label">Vorname *</label><input name="vorname" required className="input" /></div>
            <div><label className="form-label">Nachname *</label><input name="nachname" required className="input" /></div>
            <div><label className="form-label">E-Mail *</label><input name="email" type="email" required className="input" /></div>
            <div><label className="form-label">Funktion</label><input name="funktion" className="input" /></div>
            <div><label className="form-label">Fraktion</label><input name="fraktion" className="input" /></div>
            <div><label className="form-label">Rolle</label>
              <select name="rolle" className="input" defaultValue="mitglied">
                {rollenAuswahl.map(r => <option key={r} value={r}>{ROLLEN_LABEL[r]}</option>)}
              </select></div>
          </div>
          <div>
            <label className="form-label">Lesezugriff auf (nur für Rolle „Mitglied" relevant)</label>
            <div className="flex flex-wrap gap-2">
              {gremien.map(g => <label key={g.id} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gk-line-str bg-white text-[13px] cursor-pointer has-[:checked]:border-gk-blau has-[:checked]:bg-gk-blau-50"><input type="checkbox" name="gremien" value={g.schluessel} className="accent-gk-blau" /> {g.name}</label>)}
            </div>
          </div>
          {neuState.fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{neuState.fehler}</p>}
          {neuState.ok && <p className="text-[13px] text-gk-ok-fg bg-gk-ok-bg rounded-lg px-3 py-2">{neuState.info}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNeuOffen(false)} className="btn-secondary">Schließen</button>
            <button type="submit" disabled={neuPending} className="btn-primary"><UserPlus size={15} /> Anlegen</button>
          </div>
        </form>
      )}

      {meldung.fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{meldung.fehler}</p>}
      {meldung.ok && meldung.info && <p className="text-[13px] text-gk-ok-fg bg-gk-ok-bg rounded-lg px-3 py-2">{meldung.info}</p>}

      <div className="card !p-0 overflow-x-auto">
        {liste.length === 0 ? <Leer text="Keine Benutzer gefunden." /> : (
          <table className="liste">
            <thead><tr><th>Name</th><th>Rolle</th><th>Zugriff auf</th><th>Status</th><th>Letzter Login</th><th></th></tr></thead>
            <tbody>
              {liste.map(m => bearbeite === m.id ? (
                <tr key={m.id} className="bg-gk-gruen-bg/60">
                  <td colSpan={6}>
                    <form className="grid sm:grid-cols-6 gap-2 items-end py-1" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('id', m.id); fd.set('was', 'bearbeiten'); aendern(fd) }}>
                      <div><label className="form-label">Vorname *</label><input name="vorname" defaultValue={m.vorname} required className="input !py-1.5" /></div>
                      <div><label className="form-label">Nachname *</label><input name="nachname" defaultValue={m.nachname} required className="input !py-1.5" /></div>
                      <div className="sm:col-span-2"><label className="form-label">E-Mail *</label><input name="email" type="email" defaultValue={m.email} required className="input !py-1.5" /></div>
                      <div><label className="form-label">Funktion</label><input name="funktion" defaultValue={m.funktion ?? ''} className="input !py-1.5" /></div>
                      <div><label className="form-label">Fraktion</label><input name="fraktion" defaultValue={m.fraktion ?? ''} className="input !py-1.5" /></div>
                      <div className="sm:col-span-6 flex justify-end gap-2">
                        <span className="mr-auto self-center text-[12px] text-gk-text-2">Bei geänderter E-Mail-Adresse meldet sich die Person künftig mit der neuen Adresse an.</span>
                        <button type="button" onClick={() => setBearbeite(null)} className="btn-secondary !py-1.5"><X size={14} /> Abbrechen</button>
                        <button type="submit" disabled={pending} className="btn-primary !py-1.5"><Check size={14} /> Speichern</button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={m.id} className={m.aktiv ? '' : 'opacity-60'}>
                  <td><p className="font-semibold flex items-center gap-1.5">{m.rolle === 'superadmin' && <LifeBuoy size={14} className="text-gk-wein" />}{m.vorname} {m.nachname}{m.id === ichId && <span className="ml-1 font-mono text-[10px] text-gk-tertiary">(Sie)</span>}</p>
                    <p className="text-[12.5px] text-gk-text-2">{[m.funktion, m.fraktion].filter(Boolean).join(' · ')}{m.funktion || m.fraktion ? ' · ' : ''}{m.email}</p></td>
                  <td>
                    {m.rolle === 'superadmin' && !binSuperadmin ? (
                      <span className="badge bg-gk-wein-bg text-gk-wein" title="ICP-Support – kann von der Verwaltung nur aktiviert/deaktiviert werden">SUPERADMIN</span>
                    ) : (
                      <select defaultValue={m.rolle} disabled={pending || m.id === ichId} className="input !py-1 !text-[12.5px] !w-auto"
                        onChange={e => { const fd = new FormData(); fd.set('id', m.id); fd.set('was', 'rolle'); fd.set('rolle', e.target.value); aendern(fd) }}>
                        {rollenAuswahl.map(r => <option key={r} value={r}>{ROLLEN_LABEL[r]}</option>)}
                      </select>
                    )}
                  </td>
                  <td>
                    {m.rolle === 'mitglied' ? (
                      <div className="flex flex-wrap gap-1.5">
                        {gremien.map(g => {
                          const an = (m.gremien as string[]).includes(g.schluessel)
                          return (
                            <button key={g.id} disabled={pending} title={an ? 'Zugriff entziehen' : 'Zugriff gewähren'}
                              onClick={() => { const fd = new FormData(); fd.set('id', m.id); fd.set('was', 'gremien')
                                const neu = an ? (m.gremien as string[]).filter(x => x !== g.schluessel) : [...m.gremien, g.schluessel]
                                neu.forEach(x => fd.append('gremien', x)); aendern(fd) }}
                              className={`badge border ${an ? 'bg-gk-blau-50 text-gk-blau border-gk-blau-100' : 'bg-white text-gk-tertiary border-gk-line line-through'}`}>{g.kurz}</button>
                          )
                        })}
                      </div>
                    ) : <span className="text-[12.5px] text-gk-text-2">alle Gremien</span>}
                  </td>
                  <td><StatusBadge status={m.aktiv ? 'aktiv' : 'deaktiviert'} /></td>
                  <td className="font-mono text-[12px] text-gk-text-2 whitespace-nowrap">{m.letzter_login ? datum(m.letzter_login) : '–'}</td>
                  <td className="whitespace-nowrap text-right">
                    {m.rolle === 'superadmin' && !binSuperadmin ? (
                      // Support-Zugang: Verwaltung schaltet den Superadmin bei Bedarf frei bzw. wieder ab
                      m.aktiv ? (
                        <button disabled={pending} title="Support-Zugang (Superadmin) deaktivieren" className="p-1.5 rounded-md hover:bg-gk-err-bg text-gk-err-fg"
                          onClick={() => { if (!confirm('Support-Zugang von ICP deaktivieren? Sie können ihn jederzeit wieder aktivieren.')) return; const fd = new FormData(); fd.set('id', m.id); fd.set('was', 'deaktivieren'); aendern(fd) }}><ShieldOff size={15} /></button>
                      ) : (
                        <button disabled={pending} title="Support-Zugang (Superadmin) aktivieren" className="p-1.5 rounded-md hover:bg-gk-ok-bg text-gk-ok-fg"
                          onClick={() => { const fd = new FormData(); fd.set('id', m.id); fd.set('was', 'aktivieren'); aendern(fd) }}><ShieldCheck size={15} /></button>
                      )
                    ) : <>
                    <button disabled={pending} title="Bearbeiten" className="p-1.5 rounded-md hover:bg-gk-bg text-gk-text-2" onClick={() => { setMeldung({}); setBearbeite(m.id) }}><Pencil size={15} /></button>
                    <button disabled={pending} title="Anmelde-Link senden" className="p-1.5 rounded-md hover:bg-gk-bg text-gk-text-2"
                      onClick={() => { const fd = new FormData(); fd.set('id', m.id); fd.set('was', 'einladung'); aendern(fd) }}><Send size={15} /></button>
                    {m.aktiv ? (
                      <button disabled={pending || m.id === ichId} title="Zugriff entziehen" className="p-1.5 rounded-md hover:bg-gk-err-bg text-gk-err-fg disabled:opacity-30"
                        onClick={() => { if (!confirm(`Zugriff für ${m.vorname} ${m.nachname} entziehen?`)) return; const fd = new FormData(); fd.set('id', m.id); fd.set('was', 'deaktivieren'); aendern(fd) }}><Ban size={15} /></button>
                    ) : (
                      <button disabled={pending} title="Zugriff wieder aktivieren" className="p-1.5 rounded-md hover:bg-gk-ok-bg text-gk-ok-fg"
                        onClick={() => { const fd = new FormData(); fd.set('id', m.id); fd.set('was', 'aktivieren'); aendern(fd) }}><RotateCcw size={15} /></button>
                    )}
                    </>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
