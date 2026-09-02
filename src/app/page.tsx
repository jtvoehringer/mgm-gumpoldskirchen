import Link from 'next/link'
import { FileText, ShieldCheck, MailCheck, UserCheck, Clock } from 'lucide-react'
import PublicShell from '@/components/layout/PublicShell'

export default function Startseite() {
  return (
    <PublicShell breit>
      <section className="grid lg:grid-cols-[1.2fr_1fr] gap-8 items-start">
        <div>
          <p className="eyebrow mb-3">Marktgemeinde Gumpoldskirchen</p>
          <h1 className="headline text-[40px] sm:text-[52px]">Sitzungsunterlagen<br />digital & sicher</h1>
          <p className="mt-5 text-[16px] text-gk-text-1 leading-relaxed max-w-xl">
            Mitglieder des Gemeinderats und des Gemeindevorstands erhalten hier die Unterlagen ihrer Sitzungen –
            persönlich eingeladen, nur für das eigene Gremium, jederzeit im Browser abrufbar.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/login" className="btn-primary px-5 py-2.5 text-[14px]">Anmelden</Link>
          </div>
        </div>

        <div className="card">
          <p className="eyebrow mb-4">So funktioniert der Zugang</p>
          <ol className="space-y-4">
            {[
              { icon: UserCheck,   t: 'Zugang durch die Verwaltung', d: 'Die Gemeindeverwaltung legt Ihren Zugang persönlich an – mit jeder E-Mail-Adresse (Gmail, Outlook, Apple, …). Nichts geschieht automatisch.' },
              { icon: MailCheck,   t: 'Einladung zur Sitzung',       d: 'Vor jeder Sitzung erhalten Sie eine persönliche E-Mail mit der offiziellen Einladung und dem Link zu den Unterlagen.' },
              { icon: ShieldCheck, t: 'Anmeldung per E-Mail-Code',   d: 'Kein Passwort: Sie erhalten bei jeder Anmeldung einen Einmal-Code an Ihre E-Mail-Adresse.' },
              { icon: Clock,       t: 'Unterlagen bis zur Sitzung',  d: 'Nur die Unterlagen Ihres Gremiums, als PDF im Browser – bis 24:00 Uhr am Sitzungstag. Jeder Zugriff wird protokolliert.' },
            ].map((s, i) => (
              <li key={s.t} className="flex gap-3">
                <span className="shrink-0 w-8 h-8 rounded-lg bg-gk-blau-50 text-gk-blau flex items-center justify-center"><s.icon size={16} strokeWidth={1.75} /></span>
                <div>
                  <p className="text-[14px] font-semibold text-gk-text"><span className="font-mono text-gk-tertiary mr-1.5">0{i + 1}</span>{s.t}</p>
                  <p className="text-[13px] text-gk-text-2 leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-12 grid sm:grid-cols-3 gap-4">
        {[
          ['Gemeinderat & Gemeindevorstand', 'Unterlagen der Gemeinderats- und Vorstandssitzungen – jeweils eigener Berechtigungsbereich'],
          ['Ausschüsse', 'Umwelt, Schule, Prüfung, Wirtschaft, Bau, Soziales, Kultur und Personal – Zugang nur für die jeweiligen Mitglieder'],
          ['Verwaltung', 'Freigabe, Mitgliederverwaltung und Upload durch die Gemeindeverwaltung'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-gk-line bg-white p-5 border-t-4 border-t-gk-gruen">
            <h3 className="font-display uppercase tracking-[.03em] text-[19px] text-gk-blau">{t}</h3>
            <p className="mt-1 text-[13px] text-gk-text-2">{d}</p>
          </div>
        ))}
      </section>
    </PublicShell>
  )
}
