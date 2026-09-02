import { FileText, Paperclip, FileCheck } from 'lucide-react'
import { groesse } from '@/lib/format'
import type { Protokoll } from '@/lib/protokolle'

/** Öffnet das PDF in einem neuen Tab über /api/protokoll/[id] (signierte URL + Zugriffsprotokoll) */
export default function ProtokollLink({ protokoll, klein = false }: { protokoll: Protokoll; klein?: boolean }) {
  const Icon = protokoll.typ === 'einladung' ? FileCheck : protokoll.typ === 'beilage' ? Paperclip : FileText
  return (
    <a href={`/api/protokoll/${protokoll.id}`} target="_blank" rel="noopener"
      className={`inline-flex items-center gap-1.5 rounded-md border border-gk-line-str bg-white hover:border-gk-blau hover:text-gk-blau transition-colors ${klein ? 'px-2 py-1 text-[12px]' : 'px-3 py-1.5 text-[13px]'}`}>
      <Icon size={klein ? 13 : 15} strokeWidth={1.75} />
      <span className="max-w-[260px] truncate" title={protokoll.typ === 'einladung' ? 'Offizielle Einladung mit Tagesordnung' : undefined}>{protokoll.dateiname}</span>
      <span className="font-mono text-[10.5px] text-gk-tertiary">{groesse(protokoll.groesse)}</span>
      {!protokoll.freigegeben && <span className="badge bg-gk-blau-50 text-gk-blau">Entwurf</span>}
    </a>
  )
}
