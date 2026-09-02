import type { Metadata } from 'next'
import LoginForm from './LoginForm'

export const metadata: Metadata = { title: 'Anmelden' }

export default async function LoginSeite({ searchParams }: { searchParams: Promise<{ weiter?: string; fehler?: string }> }) {
  const sp = await searchParams
  return (
    <div className="max-w-md mx-auto">
      <h1 className="headline text-[34px]">Anmelden</h1>
      <p className="mt-3 text-[14.5px] text-gk-text-1 leading-relaxed">
        Kein Passwort nötig: Geben Sie Ihre freigegebene E-Mail-Adresse ein. Sie erhalten einen Einmal-Code
        (und einen Anmelde-Link) per E-Mail.
      </p>
      {sp.fehler && <p className="mt-4 text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{sp.fehler}</p>}
      <div className="card mt-6">
        <LoginForm weiter={sp.weiter ?? '/portal'} />
      </div>
    </div>
  )
}
