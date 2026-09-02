'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Check, X, Trash2, Eye, EyeOff } from 'lucide-react'
import { gremiumAnlegenAction, gremiumSpeichernAction, gremiumAktivAction, gremiumLoeschenAction, type AktionState } from '../actions'
import { StatusBadge, Leer } from '@/components/ui'
import type { Gremium } from '@/lib/protokolle'

type Zeile = Gremium & { sitzungen: number; mitglieder: number }

export default function GremienClient({ gremien }: { gremien: Zeile[] }) {
  const router = useRouter()
  const [neuOffen, setNeuOffen] = useState(false)
  const [bearbeite, setBearbeite] = useState<string | null>(null)
  const [meldung, setMeldung] = useState<AktionState>({})
  const [pending, start] = useTransition()
  const lauf = (fn: () => Promise<AktionState>, danach?: () => void) => start(async () => { const r = await fn(); setMeldung(r); if (r.ok) { danach?.(); router.refresh() } })

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button onClick={() => setNeuOffen(o => !o)} className="btn-primary"><Plus size={15} /> Gremium anlegen</button></div>

      {neuOffen && (
        <form className="card border-l-4 border-l-gk-gruen space-y-4" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); lauf(() => gremiumAnlegenAction(fd), () => setNeuOffen(false)) }}>
          <div className="grid sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2"><label className="form-label">Name *</label><input name="name" required className="input" placeholder="z. B. Verkehrsausschuss" /></div>
            <div><label className="form-label">Kürzel *</label><input name="kurz" required maxLength={6} className="input" placeholder="z. B. VA" /></div>
            <div><label className="form-label">Reihenfolge</label><input name="sortierung" type="number" className="input" placeholder="z. B. 18" /></div>
          </div>
          <p className="text-[12.5px] text-gk-text-2">Der technische Schlüssel wird aus dem Namen gebildet und kann danach nicht mehr geändert werden.</p>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNeuOffen(false)} className="btn-secondary">Schließen</button>
            <button type="submit" disabled={pending} className="btn-primary">Anlegen</button>
          </div>
        </form>
      )}

      {meldung.fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{meldung.fehler}</p>}
      {meldung.ok && meldung.info && <p className="text-[13px] text-gk-ok-fg bg-gk-ok-bg rounded-lg px-3 py-2">{meldung.info}</p>}

      <div className="card !p-0 overflow-x-auto">
        {gremien.length === 0 ? <Leer text="Keine Gremien vorhanden." /> : (
          <table className="liste">
            <thead><tr><th className="w-16">Reihe</th><th>Gremium</th><th>Kürzel</th><th>Mitglieder</th><th>Sitzungen</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {gremien.map(g => bearbeite === g.id ? (
                <tr key={g.id} className="bg-gk-gruen-bg/60">
                  <td colSpan={7}>
                    <form className="grid sm:grid-cols-5 gap-2 items-end py-1" onSubmit={e => { e.preventDefault(); const fd = new FormData(e.currentTarget); fd.set('id', g.id); lauf(() => gremiumSpeichernAction(fd), () => setBearbeite(null)) }}>
                      <div className="sm:col-span-2"><label className="form-label">Name *</label><input name="name" defaultValue={g.name} required className="input !py-1.5" /></div>
                      <div><label className="form-label">Kürzel *</label><input name="kurz" defaultValue={g.kurz} required maxLength={6} className="input !py-1.5" /></div>
                      <div><label className="form-label">Reihenfolge</label><input name="sortierung" type="number" defaultValue={g.sortierung} className="input !py-1.5" /></div>
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setBearbeite(null)} className="btn-secondary !py-1.5"><X size={14} /></button>
                        <button type="submit" disabled={pending} className="btn-primary !py-1.5"><Check size={14} /> Speichern</button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={g.id} className={g.aktiv ? '' : 'opacity-60'}>
                  <td className="font-mono text-[12px] text-gk-text-2">{g.sortierung}</td>
                  <td className="font-semibold">{g.name}<br /><span className="font-mono text-[11px] text-gk-tertiary font-normal">{g.schluessel}</span></td>
                  <td><span className="badge bg-gk-blau-50 text-gk-blau">{g.kurz}</span></td>
                  <td className="font-mono text-[12.5px]">{g.mitglieder}</td>
                  <td className="font-mono text-[12.5px]">{g.sitzungen}</td>
                  <td><StatusBadge status={g.aktiv ? 'aktiv' : 'inaktiv'} /></td>
                  <td className="whitespace-nowrap text-right">
                    <button disabled={pending} title="Bearbeiten" className="p-1.5 rounded-md hover:bg-gk-bg text-gk-text-2" onClick={() => { setMeldung({}); setBearbeite(g.id) }}><Pencil size={15} /></button>
                    <button disabled={pending} title={g.aktiv ? 'Deaktivieren – keine neuen Sitzungen/Zuordnungen, Altbestand bleibt' : 'Aktivieren'} className="p-1.5 rounded-md hover:bg-gk-bg text-gk-text-2"
                      onClick={() => lauf(() => gremiumAktivAction(g.id, !g.aktiv))}>{g.aktiv ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button disabled={pending || g.sitzungen > 0 || g.mitglieder > 0} title={g.sitzungen || g.mitglieder ? 'Löschen nur möglich, wenn keine Sitzungen und Mitglieder zugeordnet sind – stattdessen deaktivieren' : 'Gremium löschen'}
                      className="p-1.5 rounded-md hover:bg-gk-err-bg text-gk-err-fg disabled:opacity-30"
                      onClick={() => { if (!confirm(`Gremium „${g.name}" löschen?`)) return; lauf(() => gremiumLoeschenAction(g.id)) }}><Trash2 size={15} /></button>
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
