import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'

export default function AntragGesendet() {
  return (
    <div className="card text-center py-10">
      <span className="inline-flex w-14 h-14 rounded-full bg-gk-gruen-bg text-gk-gruen-text items-center justify-center"><CheckCircle2 size={30} strokeWidth={1.5} /></span>
      <p className="eyebrow mt-5 mb-2">Schritt 2 von 2</p>
      <h1 className="headline text-[30px]">Antrag eingelangt</h1>
      <p className="mt-3 text-[14.5px] text-gk-text-1 max-w-md mx-auto leading-relaxed">
        Vielen Dank. Die Gemeindeverwaltung prüft Ihren Antrag persönlich. Sobald der Zugang freigegeben ist, erhalten Sie
        eine E-Mail mit Ihrem Anmelde-Link – in der Regel innerhalb weniger Werktage.
      </p>
      <Link href="/" className="btn-secondary mt-7">Zur Startseite</Link>
    </div>
  )
}
