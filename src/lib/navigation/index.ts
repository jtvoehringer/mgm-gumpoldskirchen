import type { Rolle } from '@/lib/auth/rollen'

export type NavItem  = { label: string; href: string }
export type NavGroup = { key: string; label: string; items: NavItem[] }

/** Navigation je Rolle – zentral, wird von TabNav und Übersicht verwendet */
export function buildNav(rolle: Rolle): NavGroup[] {
  const groups: NavGroup[] = [
    { key: 'portal', label: 'Übersicht', items: [{ label: 'Übersicht', href: '/portal' }] },
    { key: 'protokolle', label: 'Sitzungsunterlagen', items: [
      { label: 'Alle Unterlagen', href: '/protokolle' },
      { label: 'Gemeinderat', href: '/protokolle/gemeinderat' },
      { label: 'Gemeindevorstand', href: '/protokolle/gemeindevorstand' },
    ] },
  ]
  if (rolle === 'verwaltung' || rolle === 'schriftfuehrung') {
    const items: NavItem[] = [{ label: 'Sitzungen & Upload', href: '/verwaltung/sitzungen' }]
    if (rolle === 'verwaltung') {
      items.push({ label: 'Mitglieder', href: '/verwaltung/mitglieder' })
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
