const MONATE = ['Jänner','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']
const TZ = 'Europe/Vienna'

/** Datums-/Zeitbestandteile eines Zeitpunkts in Wiener Zeit (Server läuft in UTC!) */
function teile(x: Date) {
  const p = new Intl.DateTimeFormat('de-AT', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(x)
  const g = (t: string) => p.find(q => q.type === t)?.value ?? ''
  return { tag: g('day'), monat: g('month'), jahr: g('year'), stunde: g('hour').replace('24', '00'), minute: g('minute') }
}

/** Reine Datumsangaben (YYYY-MM-DD) werden ohne Zeitzonen-Verschiebung angezeigt */
function nurDatum(d: string) { const [j, m, t] = d.split('-'); return { tag: t, monat: m, jahr: j } }

export function datum(d: string | Date | null | undefined) {
  if (!d) return '–'
  const t = typeof d === 'string' && d.length === 10 ? nurDatum(d) : teile(typeof d === 'string' ? new Date(d) : d)
  return `${t.tag}.${t.monat}.${t.jahr}`
}

export function datumLang(d: string | Date | null | undefined) {
  if (!d) return '–'
  const t = typeof d === 'string' && d.length === 10 ? nurDatum(d) : teile(typeof d === 'string' ? new Date(d) : d)
  return `${Number(t.tag)}. ${MONATE[Number(t.monat) - 1]} ${t.jahr}`
}

export function zeit(d: string | Date | null | undefined) {
  if (!d) return '–'
  const t = teile(typeof d === 'string' ? new Date(d) : d)
  return `${t.tag}.${t.monat}.${t.jahr} ${t.stunde}:${t.minute}`
}

export function groesse(bytes: number | null | undefined) {
  if (!bytes) return '–'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}
