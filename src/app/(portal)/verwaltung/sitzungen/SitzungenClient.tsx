'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, Trash2, Eye, EyeOff, FileText, Paperclip, Send, Ban, Undo2, ChevronDown, ChevronUp, RefreshCw, Check, AlertTriangle, Minus } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  sitzungAnlegenAction, sitzungLoeschenAction, protokollRegistrierenAction, protokollFreigabeAction, protokollLoeschenAction,
  sitzungEinladenAction, sitzungZugriffBeendenAction, sitzungZurueckziehenAction, einladungErneutSendenAction, type AktionState,
} from '../actions'
import { datum, groesse, zeit } from '@/lib/format'
import { StatusBadge, Leer } from '@/components/ui'
import { sitzungStatus } from '@/lib/sitzung-status'
import type { Gremium, Sitzung, Einladung } from '@/lib/protokolle'

function sicherDateiname(name: string) {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').slice(0, 120)
}

/** Nachweisliste: wer wurde eingeladen, wer hat bestätigt, wer hat geöffnet */
function Nachweis({ s, offen, pending, onErneut }: { s: Sitzung; offen: boolean; pending: boolean; onErneut: (e: Einladung) => void }) {
  const Zelle = ({ wert, fehler }: { wert: string | null; fehler?: string | null }) =>
    wert ? <span className="inline-flex items-center gap-1 text-gk-ok-fg"><Check size={13} /> <span className="font-mono text-[11.5px]">{zeit(wert)}</span></span>
    : fehler ? <span className="inline-flex items-center gap-1 text-gk-err-fg" title={fehler}><AlertTriangle size={13} /> fehlgeschlagen</span>
    : <span className="text-gk-tertiary"><Minus size={13} /></span>
  return (
    <div className="mt-3 border-t border-gk-line pt-3">
      {s.einladungen.length === 0 ? <p className="text-[12.5px] text-gk-tertiary">Keine Einladungen – im Gremium gibt es keine aktiven Mitglieder.</p> : (
        <div className="overflow-x-auto">
          <table className="liste text-[12.5px]">
            <thead><tr><th>Mitglied</th><th>Einladung gesendet</th><th>Bestätigt</th><th>Erstes Öffnen</th><th></th></tr></thead>
            <tbody>
              {s.einladungen.map(e => (
                <tr key={e.id}>
                  <td>{e.profil ? `${e.profil.nachname} ${e.profil.vorname}` : '–'}<br /><span className="text-[11.5px] text-gk-text-2">{e.profil?.email}</span></td>
                  <td><Zelle wert={e.gesendet_am} fehler={e.mail_fehler} /></td>
                  <td><Zelle wert={e.bestaetigt_am} /></td>
                  <td><Zelle wert={e.erste_ansicht_am} /></td>
                  <td className="text-right">
                    {offen && <button disabled={pending} onClick={() => onErneut(e)} title="Einladung erneut senden" className="p-1.5 rounded-md hover:bg-gk-bg text-gk-text-1"><RefreshCw size={14} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default function SitzungenClient({ gremien, sitzungen, darfLoeschen }: { gremien: Gremium[]; sitzungen: Sitzung[]; darfLoeschen: boolean }) {
  const router = useRouter()
  const [neuOffen, setNeuOffen] = useState(sitzungen.length === 0)
  const [neuState, neuAction, neuPending] = useActionState<AktionState, FormData>(sitzungAnlegenAction, {})
  const [meldung, setMeldung] = useState<AktionState>({})
  const [uploadFuer, setUploadFuer] = useState<string | null>(null)
  const [fortschritt, setFortschritt] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const [gremiumFilter, setGremiumFilter] = useState('')
  const [nachweisOffen, setNachweisOffen] = useState<Record<string, boolean>>({})

  const lauf = (fn: () => Promise<AktionState>) => start(async () => { setMeldung(await fn()); router.refresh() })

  const hochladen = async (s: Sitzung, dateien: FileList, typ: 'protokoll' | 'beilage', freigegeben: boolean) => {
    const supabase = createSupabaseBrowserClient()
    setMeldung({})
    for (const file of Array.from(dateien)) {
      if (file.type !== 'application/pdf') { setMeldung({ fehler: `${file.name}: nur PDF-Dateien sind erlaubt.` }); continue }
      setFortschritt(`Lade ${file.name} hoch …`)
      const pfad = `${s.gremium.schluessel}/${s.datum.slice(0, 4)}/${s.id}/${Date.now()}_${sicherDateiname(file.name)}`
      const { error } = await supabase.storage.from('protokolle').upload(pfad, file, { contentType: 'application/pdf', upsert: false })
      if (error) { setMeldung({ fehler: `${file.name}: ${error.message}` }); continue }
      const r = await protokollRegistrierenAction({ sitzung_id: s.id, dateiname: file.name, storage_pfad: pfad, groesse: file.size, mime: file.type, typ, freigegeben })
      if (r.fehler) setMeldung(r)
    }
    setFortschritt(null); setUploadFuer(null)
    router.refresh()
  }

  const liste = sitzungen.filter(s => !gremiumFilter || s.gremium.schluessel === gremiumFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[{ schluessel: '', name: 'Alle Gremien' }, ...gremien].map(g => (
          <button key={g.schluessel} onClick={() => setGremiumFilter(g.schluessel)}
            className={`px-3 py-1.5 rounded-md text-[13px] border ${gremiumFilter === g.schluessel ? 'bg-gk-blau text-white border-gk-blau' : 'bg-white border-gk-line-str hover:border-gk-blau'}`}>{g.name}</button>
        ))}
        <button onClick={() => setNeuOffen(o => !o)} className="btn-primary ml-auto"><Plus size={15} /> Sitzung anlegen</button>
      </div>

      {neuOffen && (
        <form action={neuAction} className="card border-l-4 border-l-gk-gruen space-y-4">
          <p className="text-[13px] text-gk-text-2">Ablauf: Sitzung anlegen → Unterlagen hochladen und freigeben → „Einladung versenden". Mitglieder sehen die Unterlagen erst nach der Einladung und nur bis 24:00 Uhr am Sitzungstag.</p>
          <div className="grid sm:grid-cols-6 gap-3">
            <div className="sm:col-span-2"><label className="form-label">Gremium *</label>
              <select name="gremium_id" required className="input">{gremien.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
            <div><label className="form-label">Datum *</label><input name="datum" type="date" required className="input" /></div>
            <div><label className="form-label">Uhrzeit</label><input name="uhrzeit" type="time" className="input" /></div>
            <div className="sm:col-span-2"><label className="form-label">Ort</label><input name="ort" className="input" placeholder="z. B. Sitzungssaal, Rathaus" /></div>
            <div><label className="form-label">Nummer</label><input name="nummer" type="number" min={1} className="input" placeholder="z. B. 12" /></div>
            <div className="sm:col-span-5"><label className="form-label">Titel *</label><input name="titel" required className="input" placeholder="12. Sitzung des Gemeinderats" /></div>
            <div className="sm:col-span-6"><label className="form-label">Notiz (für Mitglieder sichtbar)</label><input name="notiz" className="input" placeholder="z. B. öffentliche und nicht öffentliche Tagesordnung" /></div>
          </div>
          {neuState.fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{neuState.fehler}</p>}
          {neuState.ok && <p className="text-[13px] text-gk-ok-fg bg-gk-ok-bg rounded-lg px-3 py-2">{neuState.info} – jetzt Unterlagen hochladen.</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNeuOffen(false)} className="btn-secondary">Schließen</button>
            <button type="submit" disabled={neuPending} className="btn-primary">Anlegen</button>
          </div>
        </form>
      )}

      {meldung.fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{meldung.fehler}</p>}
      {meldung.ok && meldung.info && <p className="text-[13px] text-gk-ok-fg bg-gk-ok-bg rounded-lg px-3 py-2">{meldung.info}</p>}
      {fortschritt && <p className="text-[13px] text-gk-blau bg-gk-blau-50 rounded-lg px-3 py-2">{fortschritt}</p>}

      {liste.length === 0 ? <div className="card"><Leer text="Noch keine Sitzungen angelegt." /></div> : liste.map(s => {
        const status = sitzungStatus(s)
        const freigegeben = s.protokolle.filter(p => p.freigegeben).length
        const bestaetigt = s.einladungen.filter(e => e.bestaetigt_am).length
        const geoeffnet = s.einladungen.filter(e => e.erste_ansicht_am).length
        const fehlgeschlagen = s.einladungen.filter(e => !e.gesendet_am && e.mail_fehler).length
        const offen = status === 'eingeladen'
        const zeigeNachweis = !!nachweisOffen[s.id]
        return (
          <section key={s.id} className={`card ${offen ? 'border-l-4 border-l-gk-gruen' : status === 'abgelaufen' ? 'opacity-90' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{s.gremium.name} · <span className="font-mono normal-case tracking-normal">{datum(s.datum)}{s.uhrzeit ? `, ${s.uhrzeit.slice(0, 5)} Uhr` : ''}</span>{s.ort ? ` · ${s.ort}` : ''}</p>
                <h3 className="text-[16px] font-semibold text-gk-text mt-0.5 flex items-center gap-2">{s.titel} <StatusBadge status={status} /></h3>
                {s.notiz && <p className="text-[12.5px] text-gk-text-2">{s.notiz}</p>}
                {offen && <p className="text-[12px] text-gk-text-2 mt-1">Eingeladen am {zeit(s.eingeladen_am)} · Zugriff bis <strong>{zeit(s.zugriff_bis)} Uhr</strong></p>}
                {status === 'abgelaufen' && <p className="text-[12px] text-gk-text-2 mt-1">{s.zugriff_beendet_am ? `Zugriff vorzeitig beendet am ${zeit(s.zugriff_beendet_am)}` : `Zugriff automatisch beendet am ${zeit(s.zugriff_bis)}`} · für Mitglieder nicht mehr sichtbar</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { setUploadFuer(s.id); setTimeout(() => fileRef.current?.click(), 0) }} disabled={!!fortschritt} className="btn-secondary !py-1.5"><Upload size={15} /> PDF hochladen</button>
                {status === 'entwurf' && (
                  <button disabled={pending || freigegeben === 0} title={freigegeben === 0 ? 'Zuerst mindestens ein Dokument freigeben' : 'Alle Mitglieder des Gremiums einladen'} className="btn-primary !py-1.5"
                    onClick={() => { if (!confirm(`Einladung für „${s.titel}" an alle aktiven Mitglieder (${s.gremium.name}) versenden?\n\nZugriff bis 24:00 Uhr am ${datum(s.datum)}.`)) return; lauf(() => sitzungEinladenAction(s.id)) }}><Send size={15} /> Einladung versenden</button>
                )}
                {offen && <>
                  <button disabled={pending} title="Nachträglich aufgenommene Mitglieder einladen" className="btn-secondary !py-1.5" onClick={() => lauf(() => sitzungEinladenAction(s.id))}><Send size={15} /> Neue Mitglieder</button>
                  <button disabled={pending} title="Zugriff sofort beenden" className="btn-secondary !py-1.5"
                    onClick={() => { if (!confirm('Zugriff auf die Unterlagen sofort beenden? Die Mitglieder sehen die Sitzung dann nicht mehr.')) return; lauf(() => sitzungZugriffBeendenAction(s.id)) }}><Ban size={15} /> Zugriff beenden</button>
                  {darfLoeschen && bestaetigt === 0 && (
                    <button disabled={pending} title="Einladung zurückziehen (nur solange niemand bestätigt hat)" className="btn-secondary !py-1.5 !px-2.5"
                      onClick={() => { if (!confirm('Einladung zurückziehen? Die Sitzung wird wieder ein Entwurf; die bereits versendeten Links werden ungültig.')) return; lauf(() => sitzungZurueckziehenAction(s.id)) }}><Undo2 size={15} /></button>
                  )}
                </>}
                {darfLoeschen && (
                  <button disabled={pending} title="Sitzung samt Dokumenten löschen" className="btn-danger !py-1.5 !px-2.5"
                    onClick={() => { if (!confirm(`Sitzung „${s.titel}" inklusive aller Dokumente und Nachweise löschen?`)) return; lauf(() => sitzungLoeschenAction(s.id)) }}><Trash2 size={15} /></button>
                )}
              </div>
            </div>

            {s.protokolle.length === 0 ? <p className="mt-3 text-[12.5px] text-gk-tertiary">Noch kein Dokument – zuerst Unterlagen hochladen und freigeben, dann einladen.</p> : (
              <ul className="mt-3 divide-y divide-gk-line border-t border-gk-line">
                {s.protokolle.map(p => (
                  <li key={p.id} className="py-2 flex flex-wrap items-center gap-3">
                    {p.typ === 'beilage' ? <Paperclip size={15} className="text-gk-tertiary" /> : <FileText size={15} className="text-gk-blau" />}
                    <a href={`/api/protokoll/${p.id}`} target="_blank" rel="noopener" className="text-[13.5px] font-medium hover:text-gk-blau hover:underline">{p.dateiname}</a>
                    <span className="font-mono text-[11px] text-gk-tertiary">{groesse(p.groesse)} · {datum(p.hochgeladen_am)}</span>
                    <StatusBadge status={p.freigegeben ? 'freigegeben' : 'entwurf'} />
                    <span className="ml-auto flex gap-1">
                      <button disabled={pending} title={p.freigegeben ? 'Freigabe zurücknehmen' : 'Für Mitglieder freigeben'} className="p-1.5 rounded-md hover:bg-gk-bg text-gk-text-1"
                        onClick={() => lauf(() => protokollFreigabeAction(p.id, !p.freigegeben))}>{p.freigegeben ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                      <button disabled={pending} title="Dokument löschen" className="p-1.5 rounded-md hover:bg-gk-err-bg text-gk-err-fg"
                        onClick={() => { if (!confirm(`„${p.dateiname}" löschen?`)) return; lauf(() => protokollLoeschenAction(p.id)) }}><Trash2 size={15} /></button>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {status !== 'entwurf' && (
              <div className="mt-3">
                <button onClick={() => setNachweisOffen(o => ({ ...o, [s.id]: !o[s.id] }))} className="flex items-center gap-2 text-[12.5px] text-gk-text-1 hover:text-gk-blau">
                  {zeigeNachweis ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span className="font-mono">Nachweis: {s.einladungen.length} eingeladen · {bestaetigt} bestätigt · {geoeffnet} geöffnet{fehlgeschlagen ? ` · ${fehlgeschlagen} Mail-Fehler` : ''}</span>
                </button>
                {zeigeNachweis && <Nachweis s={s} offen={offen} pending={pending} onErneut={e => lauf(() => einladungErneutSendenAction(e.id))} />}
              </div>
            )}
          </section>
        )
      })}

      {/* verstecktes Datei-Feld: Upload direkt in den Storage (Browser → Supabase), danach Registrierung per Server Action */}
      <input ref={fileRef} type="file" accept="application/pdf" multiple className="hidden"
        onChange={e => {
          const s = sitzungen.find(x => x.id === uploadFuer)
          if (s && e.target.files?.length) {
            const freigeben = confirm('Dokument(e) sofort für Mitglieder freigeben?\n\nOK = freigeben · Abbrechen = als Entwurf speichern')
            void hochladen(s, e.target.files, 'protokoll', freigeben)
          }
          e.target.value = ''
        }} />
    </div>
  )
}
