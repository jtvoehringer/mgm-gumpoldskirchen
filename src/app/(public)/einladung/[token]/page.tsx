import type { Metadata } from 'next'
import Link from 'next/link'
import { CalendarDays, MapPin, FileText, Clock, CheckCircle2 } from 'lucide-react'
import { ladeEinladung, einladungBestaetigenAction } from '../actions'
import { datumLang, zeit } from '@/lib/format'

export const metadata: Metadata = { title: 'Sitzungseinladung' }
export const dynamic = 'force-dynamic'

/** Zwischenseite aus der Einladungsmail: zeigt die Sitzung und protokolliert den Klick auf „JA, ich möchte zugreifen" */
export default async function EinladungSeite({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const e = await ladeEinladung(token)

  if (e.status === 'ungueltig') return (
    <div className="max-w-md mx-auto">
      <h1 className="headline text-[34px]">Einladung ungültig</h1>
      <p className="mt-3 text-[14.5px] text-gk-text-1 leading-relaxed">Dieser Einladungslink ist nicht (mehr) gültig. Bitte wenden Sie sich bei Fragen an die Gemeindeverwaltung.</p>
      <Link href="/login" className="btn-secondary mt-6 inline-flex">Zur Anmeldung</Link>
    </div>
  )

  const s = e.sitzung!
  return (
    <div className="max-w-lg mx-auto">
      <p className="eyebrow mb-1">Sitzungseinladung</p>
      <h1 className="headline text-[34px]">{s.gremium}</h1>
      <p className="mt-2 text-[14.5px] text-gk-text-1">Guten Tag {e.name}, die Sitzungsunterlagen für die folgende Sitzung stehen bereit:</p>

      <div className="card mt-6 border-l-4 border-l-gk-gruen">
        <h2 className="text-[18px] font-semibold text-gk-text">{s.titel}</h2>
        <ul className="mt-3 space-y-1.5 text-[13.5px] text-gk-text-1">
          <li className="flex items-center gap-2"><CalendarDays size={15} className="text-gk-blau" /> {datumLang(s.datum)}{s.uhrzeit ? `, ${s.uhrzeit.slice(0, 5)} Uhr` : ''}</li>
          {s.ort && <li className="flex items-center gap-2"><MapPin size={15} className="text-gk-blau" /> {s.ort}</li>}
          <li className="flex items-center gap-2"><FileText size={15} className="text-gk-blau" /> {s.dokumente} Dokument{s.dokumente === 1 ? '' : 'e'}</li>
          <li className="flex items-center gap-2"><Clock size={15} className="text-gk-blau" /> Zugriff bis {zeit(s.zugriff_bis)} Uhr</li>
        </ul>
      </div>

      {e.status === 'abgelaufen' ? (
        <p className="mt-6 text-[13.5px] text-gk-warn-fg bg-gk-warn-bg rounded-lg px-3 py-2.5">Das Zugriffsfenster für diese Sitzung ist abgelaufen. Die Unterlagen stehen nicht mehr zur Verfügung.</p>
      ) : (
        <form action={einladungBestaetigenAction} className="mt-6 space-y-3">
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="btn-primary w-full !py-3 text-[15px]"><CheckCircle2 size={17} /> JA, ich möchte zugreifen</button>
          <p className="text-[12.5px] text-gk-text-2 text-center">
            {e.bestaetigt_am ? `Bereits bestätigt am ${zeit(e.bestaetigt_am)} Uhr.` : 'Ihre Bestätigung wird mit Name, Sitzung und Zeitpunkt protokolliert.'}
            {' '}Anschließend melden Sie sich mit Ihrer E-Mail-Adresse an (Einmal-Code, kein Passwort).
          </p>
        </form>
      )}
    </div>
  )
}
