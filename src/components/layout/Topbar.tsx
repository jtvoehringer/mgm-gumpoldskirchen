'use client'

// ── Kopfleiste (Dunkelblau, Negativ-Logo lt. CD) ────────────────────────────
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, LogOut, User } from 'lucide-react'
import Logo from './Logo'

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export default function Topbar({ userName, userEmail, rolleLabel, istVerwaltung }: {
  userName: string; userEmail: string; rolleLabel: string; istVerwaltung: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('mousedown', h)
    return () => window.removeEventListener('mousedown', h)
  }, [open])

  return (
    <header className="bg-gk-blau text-white shrink-0 z-40">
      <div className="h-14 max-w-6xl mx-auto px-4 lg:px-6 flex items-center gap-4">
        <Link href="/portal" className="shrink-0 flex items-center gap-3 hover:opacity-90" title="Zur Übersicht">
          <Logo className="h-9" />
          <span className="hidden sm:inline font-display uppercase tracking-[.04em] text-[15px] font-semibold border-l border-white/25 pl-3 leading-none">Sitzungsunterlagen</span>
        </Link>
        <div className="flex-1" />
        <div ref={ref} className="relative">
          <button onClick={() => setOpen(o => !o)} className="flex items-center gap-2 rounded-md px-1.5 py-1 hover:bg-white/10">
            <span className="w-8 h-8 rounded-full bg-white/15 font-mono text-[12px] font-medium flex items-center justify-center">{initials(userName)}</span>
            <span className="hidden md:block text-left leading-tight">
              <span className="block text-[13px] font-medium">{userName}</span>
              <span className="block text-[11px] text-white/65">{rolleLabel}</span>
            </span>
            <ChevronDown size={14} className="text-white/70" />
          </button>
          {open && (
            <div className="absolute right-0 mt-1 w-60 bg-white text-gk-text rounded-xl border border-gk-line shadow-lg py-1 z-50">
              <div className="px-3 py-2 border-b border-gk-line">
                <p className="text-[13px] font-semibold truncate">{userName}</p>
                <p className="text-[12px] text-gk-text-2 truncate">{userEmail}</p>
              </div>
              <Link href="/profil" onClick={() => setOpen(false)} className="flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-gk-bg"><User size={15} /> Mein Profil</Link>
              <form action="/auth/abmelden" method="post">
                <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 text-[13px] hover:bg-gk-bg text-left"><LogOut size={15} /> Abmelden</button>
              </form>
            </div>
          )}
        </div>
      </div>
      <div className="gruener-balken" />
    </header>
  )
}
