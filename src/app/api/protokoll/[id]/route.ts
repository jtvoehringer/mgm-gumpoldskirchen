import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getProfil } from '@/lib/auth/roles'

/**
 * Protokoll öffnen: prüft über RLS, ob der Benutzer das Dokument sehen darf,
 * schreibt einen Eintrag ins Zugriffsprotokoll und leitet auf eine kurzlebige signierte URL um.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profil = await getProfil()
  if (!profil) return NextResponse.redirect(new URL('/login', request.url))

  const supabase = await createSupabaseServerClient()
  const { data: p } = await supabase.from('protokolle').select('id, storage_pfad, dateiname').eq('id', id).maybeSingle()
  if (!p) return new NextResponse('Nicht gefunden oder kein Zugriff.', { status: 404 })

  const download = request.nextUrl.searchParams.get('download') === '1'
  await supabase.from('zugriffs_log').insert({ user_id: profil.id, protokoll_id: p.id, aktion: download ? 'download' : 'ansicht' })

  const { data: signed, error } = await supabase.storage.from('protokolle')
    .createSignedUrl(p.storage_pfad, 120, download ? { download: p.dateiname } : undefined)
  if (error || !signed) return new NextResponse('Dokument konnte nicht geöffnet werden.', { status: 500 })
  return NextResponse.redirect(signed.signedUrl)
}
