import type { Rolle } from '@/lib/auth/rollen'

export type NavItem  = { label: string; href: string }
export type NavGroup = { key: string; label: string; items: NavItem[] }

export type NavGremium = { schluessel: string; name: string }

/** Navigation je Rolle – zentral, wird von TabNav und Übersicht verwendet. Gremien kommen aus der Tabelle (Mitglieder: nur die eigenen). */
export function buildNav(rolle: Rolle, gremien: NavGremium[] = []): NavGroup[] {
  const groups: NavGroup[] = [
    { key: 'portal', label: 'Übersicht', items: [{ label: 'Übersicht', href: '/portal' }] },
    { key: 'protokolle', label: 'Sitzungsunterlagen', items: [
      ...(gremien.length !== 1 ? [{ label: 'Alle Unterlagen', href: '/protokolle' }] : []),
      ...gremien.map(g => ({ label: g.name, href: `/protokolle/${g.schluessel}` })),
    ] },
  ]
  if (rolle === 'verwaltung' || rolle === 'schriftfuehrung') {
    const items: NavItem[] = [{ label: 'Sitzungen & Upload', href: '/verwaltung/sitzungen' }]
    if (rolle === 'verwaltung') {
      items.push({ label: 'Mitglieder', href: '/verwaltung/mitglieder' })
      items.push({ label: 'Gremien', href: '/verwaltung/gremien' })
      items.push({ label: 'Zugriffsprotokoll', href: '/verwaltung/zugriffe' })
    }
    groups.push({ key: 'verwaltung', label: 'Verwaltung', items })
  }
  return groups
}

export function isActivePath(href: string, pathname: string) {
  return pathname === href || pathname.startsWith(href + '/')
}

export function activeGroup(groups: NavGroup[], pathname: string) {
  return groups.find(g => g.items.some(i => isActivePath(i.href, pathname))) ?? null
}
