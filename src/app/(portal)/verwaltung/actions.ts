'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { getProfil, canAdmin, canUpload } from '@/lib/auth/roles'
import { sendeMail } from '@/lib/mail'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
export type AktionState = { ok?: boolean; fehler?: string; info?: string }

async function verwaltungPflicht() {
  const p = await getProfil()
  if (!p || !canAdmin(p.rolle)) throw new Error('Keine Berechtigung.')
  return p
}
async function uploadPflicht() {
  const p = await getProfil()
  if (!p || !canUpload(p.rolle)) throw new Error('Keine Berechtigung.')
  return p
}

/** Gremien-Schlüssel → IDs */
async function gremiumIds(schluessel: string[]) {
  const supabase = await createSupabaseServerClient()
  const { data } = await supabase.from('gremien').select('id, schluessel').in('schluessel', schluessel)
  return ((data ?? []) as R[]).map(g => g.id as string)
}

/**
 * Benutzer für eine E-Mail sicherstellen: vorhandenes Profil reaktivieren, sonst per Supabase-Einladung anlegen.
 * Liefert die user_id. Der manuelle Freigabeschritt ist damit der einzige Weg zu einem Zugang.
 */
async function benutzerFreigeben(d: { email: string; vorname: string; nachname: string; funktion: string | null; fraktion: string | null; gremien: string[]; rolle?: string }) {
  const admin = createSupabaseAdminClient()
  const email = d.email.toLowerCase()
  const { data: vorhanden } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  let userId = (vorhanden as R | null)?.id as string | undefined
  let neu = false

  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { vorname: d.vorname, nachname: d.nachname },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback?weiter=/portal`,
    })
    if (error) {
      // Benutzer existiert evtl. schon in auth.users ohne Profil → nachschlagen
      const { data: liste } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const u = liste?.users.find(x => x.email?.toLowerCase() === email)
      if (!u) throw new Error(`Einladung fehlgeschlagen: ${error.message}`)
      userId = u.id
    } else {
      userId = data.user.id
      neu = true
    }
  }

  const { error: pe } = await admin.from('profiles').upsert({
    id: userId, email, vorname: d.vorname, nachname: d.nachname, funktion: d.funktion, fraktion: d.fraktion,
    rolle: d.rolle ?? 'mitglied', aktiv: true,
  }, { onConflict: 'id' })
  if (pe) throw new Error(pe.message)

  await admin.from('mitglied_gremien').delete().eq('user_id', userId)
  const ids = await gremiumIds(d.gremien)
  if (ids.length) await admin.from('mitglied_gremien').insert(ids.map(gremium_id => ({ user_id: userId, gremium_id })))

  if (!neu) {
    // Bestehender Benutzer: Hinweis-Mail mit Login-Link (kein Supabase-Invite mehr möglich)
    await sendeMail(email, 'Ihr Zugang zu den Sitzungsunterlagen wurde freigegeben',
      `Ihr Zugang wurde (erneut) freigegeben. Anmeldung mit Ihrer E-Mail-Adresse unter ${process.env.NEXT_PUBLIC_APP_URL ?? ''}/login`)
  }
  return userId!
}

// ── Zugangsanträge ──────────────────────────────────────────────────────────
export async function antragEntscheidenAction(_p: AktionState, form: FormData): Promise<AktionState> {
  try {
    const ich = await verwaltungPflicht()
    const id = String(form.get('id'))
    const entscheidung = String(form.get('entscheidung'))
    const begruendung = String(form.get('begruendung') ?? '').trim() || null
    const gremien = form.getAll('gremien').map(String)

    const supabase = await createSupabaseServerClient()
    const { data: a } = await supabase.from('zugangsantraege').select('*').eq('id', id).maybeSingle()
    if (!a) return { fehler: 'Antrag nicht gefunden.' }
    if ((a as R).status !== 'offen') return { fehler: 'Antrag wurde bereits entschieden.' }

    if (entscheidung === 'genehmigen') {
      if (gremien.length === 0) return { fehler: 'Bitte mindestens ein Gremium freigeben.' }
      const userId = await benutzerFreigeben({
        email: (a as R).email, vorname: (a as R).vorname, nachname: (a as R).nachname,
        funktion: (a as R).funktion, fraktion: (a as R).fraktion, gremien,
      })
      await supabase.from('zugangsantraege').update({ status: 'genehmigt', begruendung, entschieden_am: new Date().toISOString(), entschieden_von: ich.id, user_id: userId }).eq('id', id)
    } else {
      await supabase.from('zugangsantraege').update({ status: 'abgelehnt', begruendung, entschieden_am: new Date().toISOString(), entschieden_von: ich.id }).eq('id', id)
      await sendeMail((a as R).email, 'Ihr Antrag auf Zugang zu den Sitzungsunterlagen',
        `Sehr geehrte/r ${(a as R).vorname} ${(a as R).nachname},\n\nIhr Antrag auf Zugang zu den Sitzungsunterlagen konnte nicht freigegeben werden.${begruendung ? `\n\nBegründung: ${begruendung}` : ''}\n\nBei Fragen wenden Sie sich bitte an die Gemeindeverwaltung.\n\nMarktgemeinde Gumpoldskirchen`)
    }
    revalidatePath('/verwaltung/antraege'); revalidatePath('/verwaltung/mitglieder'); revalidatePath('/portal')
    return { ok: true, info: entscheidung === 'genehmigen' ? 'Zugang freigegeben – Einladung wurde versendet.' : 'Antrag abgelehnt.' }
  } catch (e) { return { fehler: (e as Error).message } }
}

// ── Mitglieder ──────────────────────────────────────────────────────────────
export async function mitgliedAnlegenAction(_p: AktionState, form: FormData): Promise<AktionState> {
  try {
    await verwaltungPflicht()
    const f = (k: string) => String(form.get(k) ?? '').trim()
    if (!f('email') || !f('vorname') || !f('nachname')) return { fehler: 'E-Mail, Vor- und Nachname sind Pflicht.' }
    const rolle = ['verwaltung', 'schriftfuehrung', 'mitglied'].includes(f('rolle')) ? f('rolle') : 'mitglied'
    await benutzerFreigeben({ email: f('email'), vorname: f('vorname'), nachname: f('nachname'), funktion: f('funktion') || null,
      fraktion: f('fraktion') || null, gremien: form.getAll('gremien').map(String), rolle })
    revalidatePath('/verwaltung/mitglieder')
    return { ok: true, info: 'Benutzer angelegt – Einladung wurde versendet.' }
  } catch (e) { return { fehler: (e as Error).message } }
}

export async function mitgliedAendernAction(_p: AktionState, form: FormData): Promise<AktionState> {
  try {
    const ich = await verwaltungPflicht()
    const id = String(form.get('id'))
    const was = String(form.get('was'))
    const admin = createSupabaseAdminClient()

    if (was === 'deaktivieren' || was === 'aktivieren') {
      if (id === ich.id && was === 'deaktivieren') return { fehler: 'Sie können sich nicht selbst deaktivieren.' }
      await admin.from('profiles').update({ aktiv: was === 'aktivieren' }).eq('id', id)
      if (was === 'deaktivieren') await admin.auth.admin.signOut(id).catch(() => null)
    } else if (was === 'gremien') {
      const ids = await gremiumIds(form.getAll('gremien').map(String))
      await admin.from('mitglied_gremien').delete().eq('user_id', id)
      if (ids.length) await admin.from('mitglied_gremien').insert(ids.map(gremium_id => ({ user_id: id, gremium_id })))
    } else if (was === 'rolle') {
      const rolle = String(form.get('rolle'))
      if (!['verwaltung', 'schriftfuehrung', 'mitglied'].includes(rolle)) return { fehler: 'Ungültige Rolle.' }
      if (id === ich.id && rolle !== 'verwaltung') return { fehler: 'Sie können Ihre eigene Rolle nicht herabstufen.' }
      await admin.from('profiles').update({ rolle }).eq('id', id)
    } else if (was === 'einladung') {
      const { data: p } = await admin.from('profiles').select('email').eq('id', id).maybeSingle()
      if (!p) return { fehler: 'Benutzer nicht gefunden.' }
      // Sendet die Standard-Anmelde-Mail (Code + Link) von Supabase erneut
      const { error: e2 } = await admin.auth.signInWithOtp({ email: (p as R).email, options: { shouldCreateUser: false, emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/auth/callback` } })
      if (e2) return { fehler: e2.message }
      return { ok: true, info: 'Anmelde-Link wurde erneut versendet.' }
    }
    revalidatePath('/verwaltung/mitglieder')
    return { ok: true }
  } catch (e) { return { fehler: (e as Error).message } }
}

// ── Sitzungen & Protokolle ──────────────────────────────────────────────────
export async function sitzungAnlegenAction(_p: AktionState, form: FormData): Promise<AktionState> {
  try {
    const ich = await uploadPflicht()
    const f = (k: string) => String(form.get(k) ?? '').trim()
    if (!f('gremium_id') || !f('datum') || !f('titel')) return { fehler: 'Gremium, Datum und Titel sind Pflicht.' }
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('sitzungen').insert({
      gremium_id: f('gremium_id'), datum: f('datum'), titel: f('titel'), nummer: f('nummer') ? Number(f('nummer')) : null,
      notiz: f('notiz') || null, erstellt_von: ich.id,
    })
    if (error) return { fehler: error.message }
    revalidatePath('/verwaltung/sitzungen'); revalidatePath('/protokolle', 'layout'); revalidatePath('/portal')
    return { ok: true, info: 'Sitzung angelegt.' }
  } catch (e) { return { fehler: (e as Error).message } }
}

export async function sitzungLoeschenAction(id: string): Promise<AktionState> {
  try {
    await verwaltungPflicht()
    const supabase = await createSupabaseServerClient()
    const { data: docs } = await supabase.from('protokolle').select('storage_pfad').eq('sitzung_id', id)
    const pfade = ((docs ?? []) as R[]).map(d => d.storage_pfad as string)
    if (pfade.length) await supabase.storage.from('protokolle').remove(pfade)
    const { error } = await supabase.from('sitzungen').delete().eq('id', id)
    if (error) return { fehler: error.message }
    revalidatePath('/verwaltung/sitzungen'); revalidatePath('/protokolle', 'layout'); revalidatePath('/portal')
    return { ok: true }
  } catch (e) { return { fehler: (e as Error).message } }
}

/** Nach dem Upload (Browser → Storage) das Dokument registrieren */
export async function protokollRegistrierenAction(d: { sitzung_id: string; dateiname: string; storage_pfad: string; groesse: number; mime: string; typ: 'protokoll' | 'beilage'; freigegeben: boolean }): Promise<AktionState> {
  try {
    const ich = await uploadPflicht()
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('protokolle').insert({ ...d, hochgeladen_von: ich.id })
    if (error) return { fehler: error.message }
    revalidatePath('/verwaltung/sitzungen'); revalidatePath('/protokolle', 'layout'); revalidatePath('/portal')
    return { ok: true }
  } catch (e) { return { fehler: (e as Error).message } }
}

export async function protokollFreigabeAction(id: string, freigegeben: boolean): Promise<AktionState> {
  try {
    await uploadPflicht()
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('protokolle').update({ freigegeben }).eq('id', id)
    if (error) return { fehler: error.message }
    revalidatePath('/verwaltung/sitzungen'); revalidatePath('/protokolle', 'layout'); revalidatePath('/portal')
    return { ok: true }
  } catch (e) { return { fehler: (e as Error).message } }
}

export async function protokollLoeschenAction(id: string): Promise<AktionState> {
  try {
    await uploadPflicht()
    const supabase = await createSupabaseServerClient()
    const { data: p } = await supabase.from('protokolle').select('storage_pfad').eq('id', id).maybeSingle()
    if (!p) return { fehler: 'Nicht gefunden.' }
    await supabase.storage.from('protokolle').remove([(p as R).storage_pfad])
    const { error } = await supabase.from('protokolle').delete().eq('id', id)
    if (error) return { fehler: error.message }
    revalidatePath('/verwaltung/sitzungen'); revalidatePath('/protokolle', 'layout'); revalidatePath('/portal')
    return { ok: true }
  } catch (e) { return { fehler: (e as Error).message } }
}
