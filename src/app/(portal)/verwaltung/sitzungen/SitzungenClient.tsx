'use client'

import { useActionState, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Upload, Trash2, Eye, EyeOff, FileText, Paperclip } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { sitzungAnlegenAction, sitzungLoeschenAction, protokollRegistrierenAction, protokollFreigabeAction, protokollLoeschenAction, type AktionState } from '../actions'
import { datum, groesse } from '@/lib/format'
import { StatusBadge, Leer } from '@/components/ui'
import type { Gremium, Sitzung } from '@/lib/protokolle'

function sicherDateiname(name: string) {
  return name.normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9._-]+/g, '_').replace(/_+/g, '_').slice(0, 120)
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
          <div className="grid sm:grid-cols-4 gap-3">
            <div><label className="form-label">Gremium *</label>
              <select name="gremium_id" required className="input">{gremien.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
            <div><label className="form-label">Datum *</label><input name="datum" type="date" required className="input" /></div>
            <div><label className="form-label">Nummer</label><input name="nummer" type="number" min={1} className="input" placeholder="z. B. 12" /></div>
            <div><label className="form-label">Titel *</label><input name="titel" required className="input" placeholder="12. Sitzung des Gemeinderats" /></div>
            <div className="sm:col-span-4"><label className="form-label">Notiz (für Mitglieder sichtbar)</label><input name="notiz" className="input" placeholder="z. B. öffentliche und nicht öffentliche Tagesordnung" /></div>
          </div>
          {neuState.fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{neuState.fehler}</p>}
          {neuState.ok && <p className="text-[13px] text-gk-ok-fg bg-gk-ok-bg rounded-lg px-3 py-2">{neuState.info} – jetzt Protokoll hochladen.</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setNeuOffen(false)} className="btn-secondary">Schließen</button>
            <button type="submit" disabled={neuPending} className="btn-primary">Anlegen</button>
          </div>
        </form>
      )}

      {meldung.fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{meldung.fehler}</p>}
      {fortschritt && <p className="text-[13px] text-gk-blau bg-gk-blau-50 rounded-lg px-3 py-2">{fortschritt}</p>}

      {liste.length === 0 ? <div className="card"><Leer text="Noch keine Sitzungen angelegt." /></div> : liste.map(s => (
        <section key={s.id} className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="eyebrow">{s.gremium.name} · <span className="font-mono normal-case tracking-normal">{datum(s.datum)}</span></p>
              <h3 className="text-[16px] font-semibold text-gk-text mt-0.5">{s.titel}</h3>
              {s.notiz && <p className="text-[12.5px] text-gk-text-2">{s.notiz}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setUploadFuer(s.id); setTimeout(() => fileRef.current?.click(), 0) }} disabled={!!fortschritt} className="btn-secondary !py-1.5"><Upload size={15} /> PDF hochladen</button>
              {darfLoeschen && (
                <button disabled={pending} title="Sitzung samt Dokumenten löschen" className="btn-danger !py-1.5 !px-2.5"
                  onClick={() => { if (!confirm(`Sitzung „${s.titel}" inklusive aller Dokumente löschen?`)) return; start(async () => { setMeldung(await sitzungLoeschenAction(s.id)); router.refresh() }) }}><Trash2 size={15} /></button>
              )}
            </div>
          </div>

          {s.protokolle.length === 0 ? <p className="mt-3 text-[12.5px] text-gk-tertiary">Noch kein Dokument – Mitglieder sehen „Protokoll folgt".</p> : (
            <ul className="mt-3 divide-y divide-gk-line border-t border-gk-line">
              {s.protokolle.map(p => (
                <li key={p.id} className="py-2 flex flex-wrap items-center gap-3">
                  {p.typ === 'beilage' ? <Paperclip size={15} className="text-gk-tertiary" /> : <FileText size={15} className="text-gk-blau" />}
                  <a href={`/api/protokoll/${p.id}`} target="_blank" rel="noopener" className="text-[13.5px] font-medium hover:text-gk-blau hover:underline">{p.dateiname}</a>
                  <span className="font-mono text-[11px] text-gk-tertiary">{groesse(p.groesse)} · {datum(p.hochgeladen_am)}</span>
                  <StatusBadge status={p.freigegeben ? 'freigegeben' : 'entwurf'} />
                  <span className="ml-auto flex gap-1">
                    <button disabled={pending} title={p.freigegeben ? 'Freigabe zurücknehmen' : 'Für Mitglieder freigeben'} className="p-1.5 rounded-md hover:bg-gk-bg text-gk-text-1"
                      onClick={() => start(async () => { setMeldung(await protokollFreigabeAction(p.id, !p.freigegeben)); router.refresh() })}>{p.freigegeben ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button disabled={pending} title="Dokument löschen" className="p-1.5 rounded-md hover:bg-gk-err-bg text-gk-err-fg"
                      onClick={() => { if (!confirm(`„${p.dateiname}" löschen?`)) return; start(async () => { setMeldung(await protokollLoeschenAction(p.id)); router.refresh() }) }}><Trash2 size={15} /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {/* verstecktes Datei-Feld: Upload direkt in den Storage (Browser → Supabase), danach Registrierung per Server Action */}
      <input ref={fileRef} type="file" accept="application/pdf" multiple className="hidden"
        onChange={e => {
          const s = sitzungen.find(x => x.id === uploadFuer)
          if (s && e.target.files?.length) {
            const freigeben = confirm('Dokument(e) sofort für Mitglieder freigeben?\n\nOK = sofort sichtbar · Abbrechen = als Entwurf speichern')
            void hochladen(s, e.target.files, 'protokoll', freigeben)
          }
          e.target.value = ''
        }} />
    </div>
  )
}
