// Client-sichere Rollen-Definitionen (ohne server-only-Import) – auch in Client-Komponenten verwendbar
export type Rolle = 'verwaltung' | 'schriftfuehrung' | 'mitglied'

export const ROLLEN_LABEL: Record<Rolle, string> = {
  verwaltung:      'Gemeindeverwaltung',
  schriftfuehrung: 'Schriftführung',
  mitglied:        'Mitglied',
}

export const canAdmin  = (r: Rolle) => r === 'verwaltung'
export const canUpload = (r: Rolle) => r === 'verwaltung' || r === 'schriftfuehrung'

export function anzeigename(p: { vorname: string; nachname: string; email: string }) {
  const n = `${p.vorname} ${p.nachname}`.trim()
  return n || p.email
}
