// Client-sichere Rollen-Definitionen (ohne server-only-Import) – auch in Client-Komponenten verwendbar
export type Rolle = 'superadmin' | 'verwaltung' | 'schriftfuehrung' | 'mitglied'

export const ROLLEN_LABEL: Record<Rolle, string> = {
  superadmin:      'SUPERADMIN',
  verwaltung:      'Gemeindeverwaltung',
  schriftfuehrung: 'Schriftführung',
  mitglied:        'Mitglied',
}

export const isSuperadmin = (r: Rolle) => r === 'superadmin'
export const canAdmin  = (r: Rolle) => r === 'superadmin' || r === 'verwaltung'
export const canUpload = (r: Rolle) => canAdmin(r) || r === 'schriftfuehrung'

export function anzeigename(p: { vorname: string; nachname: string; email: string }) {
  const n = `${p.vorname} ${p.nachname}`.trim()
  return n || p.email
}
