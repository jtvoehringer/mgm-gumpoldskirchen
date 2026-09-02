'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, FolderUp, FileCheck, Trash2, Eye, EyeOff, FileText, Paperclip, Send, Ban, Undo2, ChevronDown, ChevronUp, RefreshCw, Check, AlertTriangle, Minus } from 'lucide-react'
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

type DokTyp = 'protokoll' | 'beilage' | 'einladung'

/** Dateien aus einem Drop – auch ganze Ordner (rekursiv über die FileSystem-Entries der Browser) */
async function dateienAusDrop(dt: DataTransfer): Promise<File[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const entries = Array.from(dt.items ?? []).map(i => (i as any).webkitGetAsEntry?.() as FileSystemEntry | null).filter(Boolean) as FileSystemEntry[]
  if (entries.length === 0) return Array.from(dt.files ?? [])
  const out: File[] = []
  const lies = (e: FileSystemEntry): Promise<void> => new Promise(res => {
    if (e.isFile) (e as FileSystemFileEntry).file(f => { out.push(f); res() }, () => res())
    else if (e.isDirectory) {
      const reader = (e as FileSystemDirectoryEntry).createReader()
      const alle: FileSystemEntry[] = []
      const weiter = () => reader.readEntries(async batch => {
        if (batch.length === 0) { for (const x of alle) await lies(x); res() } else { alle.push(...batch); weiter() }
      }, () => res())
      weiter()
    } else res()
  })
  for (const e of entries) await lies(e)
  return out
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
  const [neuState, setNeuState] = useState<AktionState>({})
  const [neuPending, setNeuPending] = useState(false)
  const [meldung, setMeldung] = useState<AktionState>({})
  const [uploadFuer, setUploadFuer] = useState<string | null>(null)
  const [fortschritt, setFortschritt] = useState<string | null>(null)
  const [dropAktiv, setDropAktiv] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const ordnerRef = useRef<HTMLInputElement>(null)
  const einladungRef = useRef<HTMLInputElement>(null)
  const neuEinladungRef = useRef<HTMLInputElement>(null)
  const [gremiumFilter, setGremiumFilter] = useState('')
  const [nachweisOffen, setNachweisOffen] = useState<Record<string, boolean>>({})

  const lauf = (fn: () => Promise<AktionState>) => start(async () => { setMeldung(await fn()); router.refresh() })

  /** Upload Browser → Storage, danach Registrierung. Nicht-PDFs werden übersprungen und gesammelt gemeldet. */
  const hochladen = async (s: { id: string; datum: string; gremium: { schluessel: string } }, dateien: File[], typ: DokTyp, freigegeben: boolean) => {
    const supabase = createSupabaseBrowserClient()
    setMeldung({})
    const uebersprungen: string[] = []; const fehler: string[] = []; let ok = 0
    const pdfs = dateien.filter(f => { const ist = f.type === 'application/pdf' || /\.pdf$/i.test(f.name); if (!ist) uebersprungen.push(f.name); return ist })
    for (const [i, file] of pdfs.entries()) {
      setFortschritt(`Lade ${file.name} hoch … (${i + 1}/${pdfs.length})`)
      const pfad = `${s.gremium.schluessel}/${s.datum.slice(0, 4)}/${s.id}/${Date.now()}_${sicherDateiname(file.name)}`
      const { error } = await supabase.storage.from('protokolle').upload(pfad, file, { contentType: 'application/pdf', upsert: false })
      if (error) { fehler.push(`${file.name}: ${error.message}`); continue }
      const r = await protokollRegistrierenAction({ sitzung_id: s.id, dateiname: file.name, storage_pfad: pfad, groesse: file.size, mime: 'application/pdf', typ, freigegeben })
      if (r.fehler) fehler.push(`${file.name}: ${r.fehler}`); else ok++
    }
    setFortschritt(null); setUploadFuer(null)
    const teile: string[] = []
    if (ok) teile.push(`${ok} Datei${ok === 1 ? '' : 'en'} hochgeladen${typ === 'einladung' ? ' (offizielle Einladung)' : freigegeben ? ' und freigegeben' : ' als Entwurf'}.`)
    if (uebersprungen.length) teile.push(`Übersprungen (kein PDF): ${uebersprungen.join(', ')}.`)
    if (fehler.length) teile.push(`Fehler: ${fehler.join(' · ')}`)
    setMeldung(fehler.length ? { fehler: teile.join(' ') } : ok || uebersprungen.length ? { ok: true, info: teile.join(' ') } : {})
    router.refresh()
  }

  /** Sitzung anlegen; optional gleich die offizielle Einladung (PDF) anhängen */
  const anlegen = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setNeuPending(true); setNeuState({})
    const form = e.currentTarget
    const fd = new FormData(form)
    const einladung = neuEinladungRef.current?.files?.[0]
    const r = await sitzungAnlegenAction({}, fd)
    if (r.ok && r.id && einladung) {
      const gremium = gremien.find(g => g.id === String(fd.get('gremium_id')))
      await hochladen({ id: r.id, datum: String(fd.get('datum')), gremium: { schluessel: gremium?.schluessel ?? '' } }, [einladung], 'einladung', true)
      r.info = 'Sitzung angelegt, offizielle Einladung angehängt.'
    }
    setNeuState(r); setNeuPending(false)
    if (r.ok) { form.reset(); router.refresh() }
  }

  const drop = async (s: Sitzung, e: React.DragEvent) => {
    e.preventDefault(); setDropAktiv(null)
    const dateien = await dateienAusDrop(e.dataTransfer)
    if (dateien.length === 0) return
    const freigeben = confirm(`${dateien.length} Datei(en) hochladen – sofort für Mitglieder freigeben?\n\nOK = freigeben · Abbrechen = als Entwurf speichern`)
    void hochladen(s, dateien, 'protokoll', freigeben)
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
        <form onSubmit={anlegen} className="card border-l-4 border-l-gk-gruen space-y-4">
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
            <div className="sm:col-span-6"><label className="form-label">Offizielle Einladung mit Tagesordnung (PDF) – wird der Einladungsmail angehängt, kann auch später angehängt werden</label>
              <input ref={neuEinladungRef} type="file" accept="application/pdf" className="input !py-1.5 file:mr-3 file:rounded-md file:border-0 file:bg-gk-blau-50 file:px-3 file:py-1 file:text-[12.5px] file:text-gk-blau" /></div>
          </div>
          {neuState.fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{neuState.fehler}</p>}
          {neuState.ok && <p className="text-[13px] text-gk-ok-fg bg-gk-ok-bg rounded-lg px-3 py-2">{neuState.info} – jetzt Unterlagen hochladen (einzeln, als Ordner oder per Drag & Drop auf die Sitzung).</p>}
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
          <section key={s.id} className={`card ${offen ? 'border-l-4 border-l-gk-gruen' : status === 'abgelaufen' ? 'opacity-90' : ''} ${dropAktiv === s.id ? 'ring-2 ring-gk-gruen bg-gk-gruen-bg' : ''}`}
            onDragOver={e => { e.preventDefault(); if (dropAktiv !== s.id) setDropAktiv(s.id) }} onDragLeave={() => setDropAktiv(null)} onDrop={e => void drop(s, e)}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="eyebrow">{s.gremium.name} · <span className="font-mono normal-case tracking-normal">{datum(s.datum)}{s.uhrzeit ? `, ${s.uhrzeit.slice(0, 5)} Uhr` : ''}</span>{s.ort ? ` · ${s.ort}` : ''}</p>
                <h3 className="text-[16px] font-semibold text-gk-text mt-0.5 flex items-center gap-2">{s.titel} <StatusBadge status={status} /></h3>
                {s.notiz && <p className="text-[12.5px] text-gk-text-2">{s.notiz}</p>}
                {offen && <p className="text-[12px] text-gk-text-2 mt-1">Eingeladen am {zeit(s.eingeladen_am)} · Zugriff bis <strong>{zeit(s.zugriff_bis)} Uhr</strong></p>}
                {status === 'abgelaufen' && <p className="text-[12px] text-gk-text-2 mt-1">{s.zugriff_beendet_am ? `Zugriff vorzeitig beendet am ${zeit(s.zugriff_beendet_am)}` : `Zugriff automatisch beendet am ${zeit(s.zugriff_bis)}`} · für Mitglieder nicht mehr sichtbar</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => { setUploadFuer(s.id); setTimeout(() => fileRef.current?.click(), 0) }} disabled={!!fortschritt} className="btn-secondary !py-1.5"><Upload size={15} /> PDF</button>
                <button onClick={() => { setUploadFuer(s.id); setTimeout(() => ordnerRef.current?.click(), 0) }} disabled={!!fortschritt} title="Ganzen Ordner hochladen (alle PDFs, auch Unterordner)" className="btn-secondary !py-1.5"><FolderUp size={15} /> Ordner</button>
                <button onClick={() => { setUploadFuer(s.id); setTimeout(() => einladungRef.current?.click(), 0) }} disabled={!!fortschritt} title="Offizielle Einladung mit Tagesordnung (PDF) – wird der Einladungsmail angehängt" className="btn-secondary !py-1.5"><FileCheck size={15} /> {s.protokolle.some(p => p.typ === 'einladung') ? 'Einladung ersetzen' : 'Einladung anhängen'}</button>
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

            {s.protokolle.length === 0 ? <p className="mt-3 text-[12.5px] text-gk-tertiary">Noch kein Dokument – Unterlagen hochladen (PDF, ganzer Ordner oder Dateien/Ordner hierher ziehen) und freigeben, dann einladen.</p> : (
              <ul className="mt-3 divide-y divide-gk-line border-t border-gk-line">
                {s.protokolle.map(p => (
                  <li key={p.id} className="py-2 flex flex-wrap items-center gap-3">
                    {p.typ === 'einladung' ? <FileCheck size={15} className="text-gk-gruen-text" /> : p.typ === 'beilage' ? <Paperclip size={15} className="text-gk-tertiary" /> : <FileText size={15} className="text-gk-blau" />}
                    <a href={`/api/protokoll/${p.id}`} target="_blank" rel="noopener" className="text-[13.5px] font-medium hover:text-gk-blau hover:underline">{p.dateiname}</a>
                    {p.typ === 'einladung' && <span className="badge bg-gk-gruen-bg text-gk-gruen-text">Offizielle Einladung · Mailanhang</span>}
                    <span className="font-mono text-[11px] text-gk-tertiary">{groesse(p.groesse)} · {datum(p.hochgeladen_am)}</span>
                    <StatusBadge status={p.freigegeben ? 'freigegeben' : 'entwurf'} />
                    <span className="ml-auto flex gap-1">
                      {p.typ !== 'einladung' && <button disabled={pending} title={p.freigegeben ? 'Freigabe zurücknehmen' : 'Für Mitglieder freigeben'} className="p-1.5 rounded-md hover:bg-gk-bg text-gk-text-1"
                        onClick={() => lauf(() => protokollFreigabeAction(p.id, !p.freigegeben))}>{p.freigegeben ? <EyeOff size={15} /> : <Eye size={15} />}</button>}
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
                {zeigeNachweis && <>
                  <div className="mt-2 flex gap-2">
                    <a href={`/api/reports/nachweis/${s.id}?format=pdf`} className="btn-secondary !py-1 !text-[12px]">Nachweis als PDF</a>
                    <a href={`/api/reports/nachweis/${s.id}?format=csv`} className="btn-secondary !py-1 !text-[12px]">CSV</a>
                  </div>
                  <Nachweis s={s} offen={offen} pending={pending} onErneut={e => lauf(() => einladungErneutSendenAction(e.id))} />
                </>}
              </div>
            )}
          </section>
        )
      })}

      {/* versteckte Datei-Felder: Upload direkt in den Storage (Browser → Supabase), danach Registrierung per Server Action */}
      <input ref={fileRef} type="file" accept="application/pdf" multiple className="hidden"
        onChange={e => {
          const s = sitzungen.find(x => x.id === uploadFuer)
          if (s && e.target.files?.length) {
            const freigeben = confirm('Dokument(e) sofort für Mitglieder freigeben?\n\nOK = freigeben · Abbrechen = als Entwurf speichern')
            void hochladen(s, Array.from(e.target.files), 'protokoll', freigeben)
          }
          e.target.value = ''
        }} />
      {/* Ordner-Upload: webkitdirectory liefert alle Dateien inkl. Unterordner; nur PDFs werden übernommen */}
      <input ref={ordnerRef} type="file" multiple className="hidden" {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
        onChange={e => {
          const s = sitzungen.find(x => x.id === uploadFuer)
          if (s && e.target.files?.length) {
            const dateien = Array.from(e.target.files)
            const pdfs = dateien.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)).length
            const freigeben = confirm(`${pdfs} PDF-Datei(en) aus dem Ordner hochladen${dateien.length > pdfs ? ` (${dateien.length - pdfs} andere Dateien werden übersprungen)` : ''} – sofort für Mitglieder freigeben?\n\nOK = freigeben · Abbrechen = als Entwurf speichern`)
            void hochladen(s, dateien, 'protokoll', freigeben)
          }
          e.target.value = ''
        }} />
      <input ref={einladungRef} type="file" accept="application/pdf" className="hidden"
        onChange={e => {
          const s = sitzungen.find(x => x.id === uploadFuer)
          if (s && e.target.files?.length) void hochladen(s, Array.from(e.target.files), 'einladung', true)
          e.target.value = ''
        }} />
    </div>
  )
}
