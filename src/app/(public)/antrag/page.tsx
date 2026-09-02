import type { Metadata } from 'next'
import AntragForm from './AntragForm'

export const metadata: Metadata = { title: 'Zugang beantragen' }

export default function AntragSeite() {
  return (
    <div>
      <p className="eyebrow mb-2">Schritt 1 von 2</p>
      <h1 className="headline text-[34px]">Zugang beantragen</h1>
      <p className="mt-3 text-[14.5px] text-gk-text-1 leading-relaxed">
        Der Zugang wird von der Gemeindeverwaltung persönlich geprüft und freigegeben. Nach der Freigabe erhalten Sie eine
        E-Mail mit Ihrem Anmelde-Link. Bitte verwenden Sie die E-Mail-Adresse, über die Sie als Mitglied erreichbar sind.
      </p>
      <div className="card mt-6">
        <AntragForm />
      </div>
    </div>
  )
}
