const MONATE = ['Jänner','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember']

export function datum(d: string | Date | null | undefined) {
  if (!d) return '–'
  const x = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T00:00:00' : d) : d
  return `${String(x.getDate()).padStart(2, '0')}.${String(x.getMonth() + 1).padStart(2, '0')}.${x.getFullYear()}`
}

export function datumLang(d: string | Date | null | undefined) {
  if (!d) return '–'
  const x = typeof d === 'string' ? new Date(d.length === 10 ? d + 'T00:00:00' : d) : d
  return `${x.getDate()}. ${MONATE[x.getMonth()]} ${x.getFullYear()}`
}

export function zeit(d: string | Date | null | undefined) {
  if (!d) return '–'
  const x = typeof d === 'string' ? new Date(d) : d
  return `${datum(x)} ${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`
}

export function groesse(bytes: number | null | undefined) {
  if (!bytes) return '–'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
}
