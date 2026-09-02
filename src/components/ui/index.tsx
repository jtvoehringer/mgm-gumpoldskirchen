import Link from 'next/link'

export function PageHeader({ eyebrow, titel, beschreibung, aktion }: { eyebrow?: string; titel: string; beschreibung?: string; aktion?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        {eyebrow && <p className="eyebrow mb-1">{eyebrow}</p>}
        <h1 className="headline text-[30px]">{titel}</h1>
        {beschreibung && <p className="mt-1 text-[13.5px] text-gk-text-2">{beschreibung}</p>}
      </div>
      {aktion}
    </div>
  )
}

export function Kpi({ label, wert, hinweis, href }: { label: string; wert: string | number; hinweis?: string; href?: string }) {
  const inner = (
    <>
      <p className="eyebrow">{label}</p>
      <p className="kpi mt-2">{wert}</p>
      {hinweis && <p className="mt-1.5 text-[12px] text-gk-text-2">{hinweis}</p>}
    </>
  )
  const cls = 'card !p-4 sm:!p-5 block'
  return href ? <Link href={href} className={`${cls} hover:border-gk-blau-100 transition-colors`}>{inner}</Link> : <div className={cls}>{inner}</div>
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { l: string; c: string }> = {
    offen:       { l: 'offen',       c: 'bg-gk-warn-bg text-gk-warn-fg' },
    genehmigt:   { l: 'genehmigt',   c: 'bg-gk-ok-bg text-gk-ok-fg' },
    abgelehnt:   { l: 'abgelehnt',   c: 'bg-gk-err-bg text-gk-err-fg' },
    aktiv:       { l: 'aktiv',       c: 'bg-gk-ok-bg text-gk-ok-fg' },
    deaktiviert: { l: 'entzogen',    c: 'bg-gk-err-bg text-gk-err-fg' },
    freigegeben: { l: 'freigegeben', c: 'bg-gk-ok-bg text-gk-ok-fg' },
    entwurf:     { l: 'entwurf',     c: 'bg-gk-blau-50 text-gk-blau' },
  }
  const m = map[status] ?? { l: status, c: 'bg-gk-bg text-gk-text-2' }
  return <span className={`badge ${m.c}`}>{m.l}</span>
}

export function Leer({ text }: { text: string }) {
  return <p className="text-[13.5px] text-gk-text-2 py-8 text-center">{text}</p>
}
