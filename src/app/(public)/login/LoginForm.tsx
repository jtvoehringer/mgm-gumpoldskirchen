'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, Mail } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function LoginForm({ weiter, emailVorgabe = '' }: { weiter: string; emailVorgabe?: string }) {
  const router = useRouter()
  const [email, setEmail]   = useState(emailVorgabe)
  const [code, setCode]     = useState('')
  const [schritt, setSchritt] = useState<'email' | 'code'>('email')
  const [fehler, setFehler] = useState<string | null>(null)
  const [laden, setLaden]   = useState(false)

  const codeAnfordern = async (e: React.FormEvent) => {
    e.preventDefault(); setFehler(null); setLaden(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback?weiter=${encodeURIComponent(weiter)}` },
    })
    setLaden(false)
    if (error) {
      const m = error.message
      setFehler(/signups not allowed|not found/i.test(m)
        ? 'Für diese E-Mail-Adresse ist kein freigegebener Zugang vorhanden. Bitte wenden Sie sich an die Gemeindeverwaltung.'
        : /rate limit/i.test(m)
        ? 'Derzeit können keine weiteren Anmelde-Mails versendet werden. Bitte in einigen Minuten erneut versuchen oder den Code aus der letzten E-Mail verwenden.'
        : /security purposes|after \d+ seconds/i.test(m)
        ? 'Bitte kurz warten – ein Code wurde erst vor wenigen Sekunden versendet.'
        : `Anmeldung derzeit nicht möglich (${m}).`)
      return
    }
    setSchritt('code')
  }

  const codePruefen = async (e: React.FormEvent) => {
    e.preventDefault(); setFehler(null); setLaden(true)
    const supabase = createSupabaseBrowserClient()
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
    setLaden(false)
    if (error) { setFehler('Der Code ist ungültig oder abgelaufen. Bitte erneut anfordern.'); return }
    router.push(weiter.startsWith('/') ? weiter : '/portal')
    router.refresh()
  }

  if (schritt === 'code') return (
    <form onSubmit={codePruefen} className="space-y-4">
      <p className="text-[13.5px] text-gk-text-1">Wir haben einen Code an <strong className="text-gk-text">{email}</strong> gesendet. Bitte hier eingeben (oder den Link in der E-Mail anklicken).</p>
      <div>
        <label className="form-label" htmlFor="code">Einmal-Code</label>
        <input id="code" value={code} onChange={e => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" required
          className="input font-mono text-[20px] tracking-[.3em] text-center" placeholder="········" />
      </div>
      {fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{fehler}</p>}
      <button type="submit" disabled={laden} className="btn-primary w-full"><KeyRound size={15} /> {laden ? 'Prüfe …' : 'Anmelden'}</button>
      <button type="button" onClick={() => { setSchritt('email'); setCode('') }} className="w-full text-[13px] text-gk-text-2 hover:text-gk-text">Andere E-Mail-Adresse verwenden</button>
    </form>
  )

  return (
    <form onSubmit={codeAnfordern} className="space-y-4">
      <div>
        <label className="form-label" htmlFor="email">E-Mail-Adresse</label>
        <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" className="input" placeholder="name@beispiel.at" />
      </div>
      {fehler && <p className="text-[13px] text-gk-err-fg bg-gk-err-bg rounded-lg px-3 py-2">{fehler}</p>}
      <button type="submit" disabled={laden} className="btn-primary w-full"><Mail size={15} /> {laden ? 'Sende Code …' : 'Code per E-Mail senden'}</button>
      <button type="button" onClick={() => { if (email.trim()) setSchritt('code') }} className="w-full text-[13px] text-gk-blau hover:underline">Ich habe bereits einen Code erhalten</button>
      <p className="text-[12.5px] text-gk-text-2 text-center">Noch kein Zugang? Die Gemeindeverwaltung legt Ihren Zugang an und lädt Sie per E-Mail ein.</p>
    </form>
  )
}
