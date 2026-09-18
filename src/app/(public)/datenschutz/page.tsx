import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Datenschutz' }

/**
 * Datenschutzhinweis für die Anwendung „Sitzungsunterlagen" – abgeleitet vom Datenschutz-Hinweis der
 * Marktgemeinde (www.gumpoldskirchen.at/Services/Datenschutz: Verantwortlicher, Datenschutzbeauftragter,
 * Betroffenenrechte) und ergänzt um die konkreten Verarbeitungen dieser Anwendung.
 */
export default function Datenschutz() {
  const H = ({ children }: { children: React.ReactNode }) => <p className="eyebrow mb-1 mt-2">{children}</p>
  return (
    <div>
      <h1 className="headline text-[34px]">Datenschutz</h1>
      <p className="mt-3 text-[14.5px] text-gk-text-1 leading-relaxed">
        Hinweise zur Verarbeitung personenbezogener Daten in der Anwendung „Sitzungsunterlagen" der Marktgemeinde Gumpoldskirchen.
        Ergänzend gilt der allgemeine <a href="https://www.gumpoldskirchen.at/Services/Datenschutz" className="underline underline-offset-2">Datenschutz-Hinweis der Marktgemeinde</a>.
      </p>
      <div className="card mt-6 text-[14px] text-gk-text-1 leading-relaxed space-y-3">
        <H>Verantwortlicher</H>
        <p>Marktgemeinde Gumpoldskirchen, K. Schellmanngasse 30, 2352 Gumpoldskirchen, Telefon 02252 62101-0, <a href="mailto:office@gumpoldskirchen.at" className="underline underline-offset-2">office@gumpoldskirchen.at</a></p>

        <H>Datenschutzbeauftragter</H>
        <p>Alexander Stöhr (GVA Mödling), Kampstraße 1, 2344 Maria Enzersdorf, Telefon +43 2236 73940-0, <a href="mailto:datenschutz@gvamoedling.at" className="underline underline-offset-2">datenschutz@gvamoedling.at</a><br />
          Stellvertretung: DI Kurt Berthold (clever data GmbH), Kramergasse 1, 1010 Wien, <a href="mailto:kurt.berthold@cleverdata.at" className="underline underline-offset-2">kurt.berthold@cleverdata.at</a></p>

        <H>Zweck und Rechtsgrundlage</H>
        <p>Die Anwendung dient der digitalen Bereitstellung von Sitzungsunterlagen (Einladung, Tagesordnung, Beilagen, Protokolle) an die Mitglieder des Gemeinderats, des Gemeindevorstands und der Ausschüsse sowie dem Nachweis, dass diese Unterlagen zugestellt und abgerufen wurden. Rechtsgrundlage ist die Wahrnehmung einer im öffentlichen Interesse liegenden Aufgabe (Art. 6 Abs. 1 lit. e DSGVO) in Verbindung mit den Bestimmungen der NÖ Gemeindeordnung zur Einberufung und Vorbereitung von Sitzungen.</p>

        <H>Verarbeitete Daten</H>
        <p>Von Mitgliedern der Gremien: Vor- und Nachname, E-Mail-Adresse, Funktion, Fraktion und Gremienzugehörigkeit – erfasst durch die Gemeindeverwaltung. Beim Betrieb: Zeitpunkt des Versands der Sitzungseinladung, Zeitpunkt der Bestätigung („JA, ich möchte zugreifen"), Anmeldezeitpunkte sowie Zeitpunkt jedes Aufrufs oder Downloads eines Dokuments (Zugriffsprotokoll). Von Mitarbeiter:innen der Gemeindeverwaltung zusätzlich das Passwort in verschlüsselter Form. Es werden keine weiteren Nutzungsdaten ausgewertet und keine Profile gebildet.</p>

        <H>Zugriffsprotokoll und Nachweis</H>
        <p>Einladungen, Bestätigungen und Dokumentzugriffe werden mit Person und Zeitpunkt protokolliert. Dieses Protokoll dient ausschließlich dem Nachweis der ordnungsgemäßen Zustellung und dem Schutz der nicht öffentlichen Unterlagen. Es ist nur für die Gemeindeverwaltung einsehbar.</p>

        <H>Zeitlich befristeter Zugriff</H>
        <p>Die Unterlagen einer Sitzung sind für die Mitglieder ab dem Versand der Einladung bis 24:00 Uhr am Sitzungstag abrufbar; danach endet der Zugriff automatisch. Die Unterlagen selbst verbleiben bei der Gemeindeverwaltung.</p>

        <H>Empfänger und Auftragsverarbeiter</H>
        <p>Die Anwendung wird im Auftrag der Marktgemeinde von IC&amp;P Consultants e.U. (Österreich) technisch betrieben. Datenbank und Dateiablage werden bei Supabase (Rechenzentrum Frankfurt am Main, Deutschland) gehostet, die Anwendung bei Vercel Inc. (USA; Auslieferung über Rechenzentren in der EU, Datenübermittlung auf Grundlage der EU-Standardvertragsklauseln). Der Versand von E-Mails (Einladungen, Anmelde-Codes) erfolgt über den E-Mail-Dienst der Marktgemeinde. Mit allen Dienstleistern bestehen Vereinbarungen zur Auftragsverarbeitung nach Art. 28 DSGVO. Eine Weitergabe an sonstige Dritte findet nicht statt, außer die Gemeinde ist dazu gesetzlich verpflichtet.</p>

        <H>Anmeldung, Cookies</H>
        <p>Die Anmeldung erfolgt mit einem Einmal-Code per E-Mail (Mitglieder) bzw. mit Passwort (Verwaltung). Die Anwendung setzt ausschließlich technisch notwendige Cookies zur Verwaltung der Anmeldesitzung. Es werden keine Analyse-, Tracking- oder Werbe-Cookies eingesetzt und keine Inhalte Dritter (Schriftarten, Plugins) nachgeladen.</p>

        <H>Speicherdauer</H>
        <p>Stammdaten der Mitglieder werden für die Dauer der Mitgliedschaft im jeweiligen Gremium gespeichert und nach Entzug des Zugangs deaktiviert; eine Löschung erfolgt nach Ende der Funktionsperiode bzw. auf Anfrage, sofern keine Aufbewahrungspflicht entgegensteht. Zugriffsprotokoll und Nachweislisten werden entsprechend den Aufbewahrungsvorschriften der Gemeinde für Sitzungsunterlagen aufbewahrt. Sitzungsunterlagen werden nach Ende der Aufbewahrung in der Anwendung gelöscht; das Original verbleibt im Aktenbestand der Gemeinde.</p>

        <H>Ihre Rechte</H>
        <p>Ihnen stehen die Rechte auf Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung, Datenübertragbarkeit und Widerspruch zu. Wenden Sie sich dazu an die Gemeindeverwaltung oder den Datenschutzbeauftragten. Wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer Daten gegen das Datenschutzrecht verstößt, können Sie sich bei der Österreichischen Datenschutzbehörde beschweren (<a href="https://www.dsb.gv.at" className="underline underline-offset-2">www.dsb.gv.at</a>).</p>

        <H>Sicherheit</H>
        <p>Die Übertragung erfolgt ausschließlich verschlüsselt (HTTPS). Der Zugriff auf Unterlagen ist auf die Mitglieder des jeweiligen Gremiums beschränkt und wird auf Datenbankebene durchgesetzt. Zugänge werden ausschließlich von der Gemeindeverwaltung eingerichtet; ein Zugang kann jederzeit entzogen werden.</p>

        <p className="text-[12.5px] text-gk-text-2 pt-2 border-t border-gk-line">Stand: September 2026</p>
      </div>
    </div>
  )
}
