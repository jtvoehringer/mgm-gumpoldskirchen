import 'server-only'
import { datumLang } from '@/lib/format'

/** Daten für die persönliche Sitzungseinladung */
export type EinladungsDaten = {
  anrede: string            // z. B. „Guten Tag Maria Musterfrau,"
  gremium: string           // Gemeinderat / Gemeindevorstand
  titel: string
  datum: string             // YYYY-MM-DD
  uhrzeit: string | null    // HH:MM
  ort: string | null
  anzahlDokumente: number
  link: string              // persönlicher Bestätigungslink
  anhangName?: string | null // Dateiname der offiziellen Einladung (Anhang)
}

function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Betreff, Text- und HTML-Version der Einladung (GK-CD: Dunkelblau, hellgrüner Balken) */
export function baueEinladungsmail(d: EinladungsDaten) {
  const wann = `${datumLang(d.datum)}${d.uhrzeit ? `, ${d.uhrzeit.slice(0, 5)} Uhr` : ''}`
  const betreff = `Sitzungseinladung: ${d.gremium} am ${datumLang(d.datum)}`
  const zugriffBis = `Der Zugriff auf die Unterlagen ist bis 24:00 Uhr am Sitzungstag (${datumLang(d.datum)}) möglich und endet danach automatisch.`

  const text = [
    `${d.anrede}`,
    ``,
    `die Sitzungsunterlagen für die folgende Sitzung stehen bereit:`,
    ``,
    `${d.titel}`,
    `${d.gremium} · ${wann}${d.ort ? ` · ${d.ort}` : ''}`,
    `${d.anzahlDokumente} Dokument${d.anzahlDokumente === 1 ? '' : 'e'}`,
    ...(d.anhangName ? [``, `Die offizielle Einladung mit Tagesordnung finden Sie im Anhang (${d.anhangName}).`] : []),
    ``,
    `Bitte bestätigen Sie den Zugriff über Ihren persönlichen Link:`,
    d.link,
    ``,
    zugriffBis,
    ``,
    `Dieser Link ist persönlich für Sie bestimmt – bitte nicht weiterleiten. Nach der Bestätigung melden Sie sich mit Ihrer E-Mail-Adresse an (Einmal-Code, kein Passwort).`,
    ``,
    `Marktgemeinde Gumpoldskirchen`,
    `Sitzungsunterlagen für Gemeinderat und Gemeindevorstand`,
  ].join('\n')

  const html = `<!doctype html><html lang="de"><body style="margin:0;padding:0;background:#f3f5f8;font-family:Arial,Helvetica,sans-serif;color:#1c2431">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f8;padding:24px 0"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border:1px solid #dfe4ec">
  <tr><td style="background:#004B72;padding:18px 28px"><span style="color:#fff;font-size:18px;font-weight:bold;letter-spacing:.04em;text-transform:uppercase">Sitzungsunterlagen</span><br><span style="color:#c9d4e3;font-size:12px">Marktgemeinde Gumpoldskirchen</span></td></tr>
  <tr><td style="background:#A8C959;height:5px;font-size:0;line-height:0">&nbsp;</td></tr>
  <tr><td style="padding:28px">
    <p style="font-size:15px;margin:0 0 16px">${esc(d.anrede)}</p>
    <p style="font-size:15px;margin:0 0 20px">die Sitzungsunterlagen für die folgende Sitzung stehen bereit:</p>
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f3f5f8;border-left:4px solid #A8C959;margin:0 0 24px"><tr><td style="padding:14px 18px">
      <p style="margin:0;font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#5b6675;font-family:Consolas,monospace">${esc(d.gremium)}</p>
      <p style="margin:4px 0 6px;font-size:17px;font-weight:bold">${esc(d.titel)}</p>
      <p style="margin:0;font-size:14px">${esc(wann)}${d.ort ? ` · ${esc(d.ort)}` : ''}</p>
      <p style="margin:6px 0 0;font-size:13px;color:#5b6675">${d.anzahlDokumente} Dokument${d.anzahlDokumente === 1 ? '' : 'e'}</p>
    </td></tr></table>
    ${d.anhangName ? `<p style="font-size:14px;margin:0 0 20px">Die offizielle Einladung mit Tagesordnung finden Sie im Anhang (<strong>${esc(d.anhangName)}</strong>).</p>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px"><tr><td style="background:#004B72;border-radius:6px">
      <a href="${esc(d.link)}" style="display:inline-block;padding:13px 26px;color:#fff;font-size:15px;font-weight:bold;text-decoration:none">JA, ich möchte zugreifen</a>
    </td></tr></table>
    <p style="font-size:13px;color:#5b6675;margin:0 0 10px">${esc(zugriffBis)}</p>
    <p style="font-size:13px;color:#5b6675;margin:0 0 10px">Dieser Link ist persönlich für Sie bestimmt – bitte nicht weiterleiten. Nach der Bestätigung melden Sie sich mit Ihrer E-Mail-Adresse an (Einmal-Code, kein Passwort).</p>
    <p style="font-size:12px;color:#8a94a3;margin:20px 0 0">Falls die Schaltfläche nicht funktioniert: <a href="${esc(d.link)}" style="color:#004B72">${esc(d.link)}</a></p>
  </td></tr>
  <tr><td style="border-top:1px solid #dfe4ec;padding:14px 28px;font-size:12px;color:#8a94a3">Marktgemeinde Gumpoldskirchen · Schrannenplatz 1 · 2352 Gumpoldskirchen</td></tr>
</table></td></tr></table></body></html>`

  return { betreff, text, html }
}
