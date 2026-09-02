import Link from 'next/link'
import Logo from './Logo'

/** Rahmen der öffentlichen Seiten (Start, Antrag, Login): dunkelblaue Kopfleiste mit grünem Balken */
export default function PublicShell({ children, breit = false }: { children: React.ReactNode; breit?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-gk-bg">
      <header className="bg-gk-blau text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-4 hover:opacity-90">
            <Logo className="h-12" />
            <span className="hidden sm:block border-l border-white/25 pl-4 leading-tight">
              <span className="block font-display uppercase tracking-[.04em] text-[17px] font-semibold">Sitzungsprotokolle</span>
              <span className="block text-[12px] text-white/70">Gemeinderat · Gemeindevorstand</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-[13.5px]">
            <Link href="/antrag" className="px-3 py-1.5 rounded-md hover:bg-white/10">Zugang beantragen</Link>
            <Link href="/login" className="px-3 py-1.5 rounded-md bg-white text-gk-blau font-semibold hover:bg-gk-blau-50">Anmelden</Link>
          </nav>
        </div>
        <div className="gruener-balken" />
      </header>

      <main className={`flex-1 w-full mx-auto px-4 sm:px-6 py-10 ${breit ? 'max-w-6xl' : 'max-w-3xl'}`}>{children}</main>

      <footer className="border-t border-gk-line bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3 text-[12px] text-gk-text-2">
          <span>Marktgemeinde Gumpoldskirchen · Schrannenplatz 1 · 2352 Gumpoldskirchen · <a href="https://www.gumpoldskirchen.at" className="underline underline-offset-2">www.gumpoldskirchen.at</a></span>
          <span className="flex items-center gap-4">
            <Link href="/impressum" className="hover:text-gk-text">Impressum</Link>
            <Link href="/datenschutz" className="hover:text-gk-text">Datenschutz</Link>
            <span className="font-mono text-[10.5px] text-gk-tertiary">powered by ICP Solutions</span>
          </span>
        </div>
      </footer>
    </div>
  )
}
