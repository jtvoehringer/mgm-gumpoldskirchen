'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useTransition } from 'react'

type Opt = { value: string; label: string }
type Props = {
  werte: { sitzung?: string; benutzer?: string; aktion?: string; von?: string; bis?: string }
  sitzungen: Opt[]; benutzer: Opt[]; aktionen: Opt[]
  anzahl: number; begrenzt: boolean
}

/** Filter des Zugriffsprotokolls – jede Änderung wirkt sofort (URL-Parameter), kein Button nötig */
export default function FilterLeiste({ werte, sitzungen, benutzer, aktionen, anzahl, begrenzt }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [pending, start] = useTransition()

  const setze = (key: string, value: string) => {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...werte, [key]: value })) if (v) q.set(k, v)
    start(() => router.push(`${pathname}${q.toString() ? `?${q}` : ''}`))
  }
  const gefiltert = Object.values(werte).some(Boolean)

  return (
    <div className="card mb-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
        <div className="lg:col-span-2"><label className="form-label">Sitzung</label>
          <select value={werte.sitzung ?? ''} onChange={e => setze('sitzung', e.target.value)} className="input">
            <option value="">Alle Sitzungen</option>
            {sitzungen.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></div>
        <div><label className="form-label">Benutzer</label>
          <select value={werte.benutzer ?? ''} onChange={e => setze('benutzer', e.target.value)} className="input">
            <option value="">Alle Benutzer</option>
            {benutzer.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></div>
        <div><label className="form-label">Aktion</label>
          <select value={werte.aktion ?? ''} onChange={e => setze('aktion', e.target.value)} className="input">
            <option value="">Alle Aktionen</option>
            {aktionen.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select></div>
        <div><label className="form-label">Von</label><input type="date" value={werte.von ?? ''} onChange={e => setze('von', e.target.value)} className="input" /></div>
        <div><label className="form-label">Bis</label><input type="date" value={werte.bis ?? ''} onChange={e => setze('bis', e.target.value)} className="input" /></div>
      </div>
      <div className="mt-3 flex items-center gap-3 text-[12px]">
        {gefiltert && <button type="button" onClick={() => start(() => router.push(pathname))} className="text-gk-blau hover:underline">Alle anzeigen</button>}
        <span className="ml-auto font-mono text-gk-text-2">{pending ? 'Lade …' : begrenzt ? 'mehr als 500 Einträge – Anzeige begrenzt, Export enthält alle' : `${anzahl} Einträge`}</span>
      </div>
    </div>
  )
}
