import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

/** Ziel der Anmelde-/Einladungs-Links aus den Supabase-E-Mails (PKCE-Code → Session) */
export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const tokenHash = url.searchParams.get('token_hash')
  const type = url.searchParams.get('type')
  const weiter = url.searchParams.get('weiter') ?? '/portal'

  const supabase = await createSupabaseServerClient()
  let fehler: string | null = null
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    fehler = error?.message ?? null
  } else if (tokenHash && type) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: type as any })
    fehler = error?.message ?? null
  } else {
    fehler = 'Ungültiger Link.'
  }

  if (fehler) return NextResponse.redirect(new URL(`/login?fehler=${encodeURIComponent('Der Anmelde-Link ist ungültig oder abgelaufen. Bitte neuen Code anfordern.')}`, url.origin))
  return NextResponse.redirect(new URL(weiter.startsWith('/') ? weiter : '/portal', url.origin))
}
