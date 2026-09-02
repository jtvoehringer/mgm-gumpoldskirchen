'use client'

// ── App-Rahmen des Portals ───────────────────────────────────────────────────
// Dunkelblaue Kopfleiste mit Negativ-Logo (lt. CD), grüner Balken, darunter die
// Tab-Navigation; scrollender Inhalt mit Fußzeile.

import { useMemo } from 'react'
import Topbar from './Topbar'
import TabNav from './TabNav'
import { buildNav } from '@/lib/navigation'
import type { Rolle } from '@/lib/auth/rollen'

interface Props {
  children: React.ReactNode
  userName: string
  userEmail: string
  rolle: Rolle
  rolleLabel: string
}

export const APP_VERSION = 'v0.1.0 · September 2026'

export default function AppShell({ children, userName, userEmail, rolle, rolleLabel }: Props) {
  const groups = useMemo(() => buildNav(rolle), [rolle])
  const buildSha = process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gk-bg">
      <Topbar userName={userName} userEmail={userEmail} rolleLabel={rolleLabel} istVerwaltung={rolle === 'verwaltung'} />
      <TabNav groups={groups} />
      <main className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8">{children}</div>
        <footer className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 pt-2">
          <div className="border-t border-gk-line pt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-[11.5px] text-gk-text-2">
            <span>Marktgemeinde Gumpoldskirchen · Sitzungsunterlagen für Gemeinderat und Gemeindevorstand</span>
            <span className="font-mono text-[10.5px] text-gk-tertiary" title={buildSha ? `Build ${buildSha}` : undefined}>
              powered by ICP Solutions · {APP_VERSION}{buildSha ? ` · ${buildSha.slice(0, 7)}` : ''}
            </span>
          </div>
        </footer>
      </main>
    </div>
  )
}
