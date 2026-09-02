'use client'

// ── Horizontale Hauptnavigation: Bereiche als Tabs, Seiten des Bereichs als Chips ──
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { activeGroup, isActivePath, type NavGroup } from '@/lib/navigation'

export default function TabNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname()
  const aktiv = activeGroup(groups, pathname)

  return (
    <nav className="bg-gk-surface border-b border-gk-line shrink-0 z-30" aria-label="Hauptnavigation">
      <div className="max-w-6xl mx-auto px-2 lg:px-3 flex gap-0.5 overflow-x-auto [scrollbar-width:none]">
        {groups.map(g => {
          const active = g.key === aktiv?.key
          return (
            <Link key={g.key} href={g.items[0].href} aria-current={active ? 'true' : undefined}
              className={`px-3.5 pt-[13px] pb-[10px] text-[14.5px] whitespace-nowrap border-b-[3px] transition-colors ${
                active ? 'text-gk-blau font-semibold border-gk-gruen' : 'text-gk-text-1 font-medium border-transparent hover:text-gk-text'}`}>
              {g.label}
            </Link>
          )
        })}
      </div>
      {aktiv && aktiv.items.length > 1 && (
        <div className="border-t border-gk-line bg-gk-bg/70">
          <div className="max-w-6xl mx-auto px-3 lg:px-4 py-1.5 flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {aktiv.items.map(item => {
              const active = isActivePath(item.href, pathname)
                && !aktiv.items.some(o => o !== item && o.href.length > item.href.length && isActivePath(o.href, pathname))
              return (
                <Link key={item.href} href={item.href} aria-current={active ? 'page' : undefined}
                  className={`px-2.5 py-[5px] rounded-md text-[13px] whitespace-nowrap transition-colors ${
                    active ? 'bg-gk-blau-50 text-gk-blau font-semibold' : 'text-gk-text-1 hover:bg-gk-line/60 hover:text-gk-text'}`}>
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </nav>
  )
}
