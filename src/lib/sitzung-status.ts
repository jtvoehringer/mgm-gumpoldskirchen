export type SitzungStatus = 'entwurf' | 'eingeladen' | 'abgelaufen'

/** Effektiver Status einer Sitzung: „abgelaufen", sobald das Zugriffsfenster (24:00 am Sitzungstag) vorbei ist. Client- und serverseitig nutzbar. */
export function sitzungStatus(s: { status: 'entwurf' | 'eingeladen'; zugriff_bis: string | null }): SitzungStatus {
  if (s.status === 'eingeladen' && s.zugriff_bis && new Date(s.zugriff_bis).getTime() <= Date.now()) return 'abgelaufen'
  return s.status
}
