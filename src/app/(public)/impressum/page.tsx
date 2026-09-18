import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Impressum' }

/** Impressum – abgeleitet von der Offenlegung auf www.gumpoldskirchen.at (§§ 24 f MedienG) */
export default function Impressum() {
  return (
    <div>
      <h1 className="headline text-[34px]">Impressum</h1>
      <div className="card mt-6 text-[14px] text-gk-text-1 leading-relaxed space-y-4">
        <div>
          <p className="eyebrow mb-1">Medieninhaber und Herausgeber</p>
          <p><strong className="text-gk-text">Marktgemeinde Gumpoldskirchen</strong><br />
            K. Schellmanngasse 30, 2352 Gumpoldskirchen<br />
            Telefon: 02252 62101-0 · Fax: 02252 62101-33<br />
            E-Mail: <a href="mailto:office@gumpoldskirchen.at" className="underline underline-offset-2">office@gumpoldskirchen.at</a><br />
            <a href="https://www.gumpoldskirchen.at" className="underline underline-offset-2">www.gumpoldskirchen.at</a></p>
          <p className="mt-2">Ansprechperson: Amtsleiter Ing. Harald Nirschl<br />UID: ATU16233608 · DVR: 0060496</p>
        </div>
        <div>
          <p className="eyebrow mb-1">Zweck dieser Anwendung</p>
          <p>Bereitstellung der Sitzungsunterlagen des Gemeinderats, des Gemeindevorstands und der Ausschüsse der Marktgemeinde Gumpoldskirchen ausschließlich an deren Mitglieder. Die Anwendung ist nicht öffentlich; der Zugang wird von der Gemeindeverwaltung persönlich eingerichtet.</p>
        </div>
        <div>
          <p className="eyebrow mb-1">Haftung</p>
          <p>Die bereitgestellten Unterlagen dienen der Vorbereitung auf die jeweilige Sitzung. Für die Richtigkeit und Vollständigkeit der Inhalte ist die Gemeindeverwaltung als Ersteller verantwortlich. Die Marktgemeinde übernimmt keine Verpflichtung, die Anwendung unterbrechungsfrei und jederzeit abrufbar zu halten.</p>
        </div>
        <p className="text-[12.5px] text-gk-text-2">Technische Umsetzung und Betrieb im Auftrag der Marktgemeinde: IC&amp;P Consultants e.U., <a href="https://www.icp-consultants.at" className="underline underline-offset-2">www.icp-consultants.at</a></p>
      </div>
    </div>
  )
}
