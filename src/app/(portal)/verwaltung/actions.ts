'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { Rolle } from '@/lib/auth/rollen'
import { getProfil, canAdmin, canUpload, isSuperadmin } from '@/lib/auth/roles'
import { sendeMailMitFehler } from '@/lib/mail'
import { baueEinladungsmail } from '@/lib/einladungsmail'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
export type AktionState = { ok?: boolean; fehler?: string; info?: string; id?: string }

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
 * Benutzer für eine E-Mail sicherstellen: vorhandenes Profil reaktivieren, sonst Konto anlegen – OHNE Mailversand.
 * Den Anmelde-Link schickt die Verwaltung bei Bedarf über das Senden-Symbol (oder die Sitzungseinladung).
 * Liefert die user_id. Das Anlegen durch die Verwaltung ist der einzige Weg zu einem Zugang.
 */
async function benutzerFreigeben(d: { email: string; vorname: string; nachname: string; funktion: string | null; fraktion: string | null; gremien: string[]; rolle?: string }) {
  const admin = createSupabaseAdminClient()
  const email = d.email.toLowerCase()
  const { data: vorhanden } = await admin.from('profiles').select('id').eq('email', email).maybeSingle()
  let userId = (vorhanden as R | null)?.id as string | undefined

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { vorname: d.vorname, nachname: d.nachname } })
    if (error) {
      // Benutzer existiert evtl. schon in auth.users ohne Profil → nachschlagen
      const { data: liste } = await admin.auth.admin.listUsers({ perPage: 1000 })
      const u = liste?.users.find(x => x.email?.toLowerCase() === email)
      if (!u) throw new Error(`Konto konnte nicht angelegt werden: ${error.message}`)
      userId = u.id
      if (!u.email_confirmed_at) await admin.auth.admin.updateUserById(u.id, { email_confirm: true }).catch(() => null)
    } else {
      userId = data.user.id
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

  return userId!
}

// ── Mitglieder ──────────────────────────────────────────────────────────────
export async function mitgliedAnlegenAction(_p: AktionState, form: FormData): Promise<AktionState> {
  try {
    const ich = await verwaltungPflicht()
    const f = (k: string) => String(form.get(k) ?? '').trim()
    if (!f('email') || !f('vorname') || !f('nachname')) return { fehler: 'E-Mail, Vor- und Nachname sind Pflicht.' }
    const erlaubt = isSuperadmin(ich.rolle) ? ['superadmin', 'verwaltung', 'schriftfuehrung', 'mitglied'] : ['verwaltung', 'schriftfuehrung', 'mitglied']
    const rolle = erlaubt.includes(f('rolle')) ? f('rolle') : 'mitglied'
    await benutzerFreigeben({ email: f('email'), vorname: f('vorname'), nachname: f('nachname'), funktion: f('funktion') || null,
      fraktion: f('fraktion') || null, gremien: form.getAll('gremien').map(String), rolle })
    revalidatePath('/verwaltung/mitglieder')
    return { ok: true, info: 'Benutzer angelegt. Es wurde keine E-Mail versendet – den Anmelde-Link bei Bedarf über das Senden-Symbol verschicken.' }
  } catch (e) { return { fehler: (e as Error).message } }
}

export async function mitgliedAendernAction(_p: AktionState, form: FormData): Promise<AktionState> {
  try {
    const ich = await verwaltungPflicht()
    const id = String(form.get('id'))
    const was = String(form.get('was'))
    const admin = createSupabaseAdminClient()

    const { data: zielProfil } = await admin.from('profiles').select('rolle').eq('id', id).maybeSingle()
    const zielRolle = (zielProfil as R | null)?.rolle as string | undefined
    // Superadmin (ICP-Support): Verwaltung darf ihn nur aktivieren/deaktivieren, sonst nichts ändern
    if (zielRolle === 'superadmin' && !isSuperadmin(ich.rolle) && was !== 'deaktivieren' && was !== 'aktivieren') {
      return { fehler: 'Der Superadmin-Zugang kann von der Verwaltung nur aktiviert oder deaktiviert werden.' }
    }

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
      const erlaubt = isSuperadmin(ich.rolle) ? ['superadmin', 'verwaltung', 'schriftfuehrung', 'mitglied'] : ['verwaltung', 'schriftfuehrung', 'mitglied']
      if (!erlaubt.includes(rolle)) return { fehler: 'Ungültige Rolle.' }
      if (id === ich.id && !canAdmin(rolle as Rolle)) return { fehler: 'Sie können Ihre eigene Rolle nicht herabstufen.' }
      await admin.from('profiles').update({ rolle }).eq('id', id)
    } else if (was === 'bearbeiten') {
      // Stammdaten ändern; E-Mail-Änderung auch im Auth-Konto (ohne Bestätigungsmail)
      const f = (k: string) => String(form.get(k) ?? '').trim()
      if (!f('vorname') || !f('nachname') || !f('email')) return { fehler: 'Vor- und Nachname sowie E-Mail sind Pflicht.' }
      const email = f('email').toLowerCase()
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { fehler: 'Bitte eine gültige E-Mail-Adresse angeben.' }
      const { data: alt } = await admin.from('profiles').select('email').eq('id', id).maybeSingle()
      if (!alt) return { fehler: 'Benutzer nicht gefunden.' }
      if ((alt as R).email !== email) {
        const { data: dup } = await admin.from('profiles').select('id').eq('email', email).neq('id', id).maybeSingle()
        if (dup) return { fehler: 'Diese E-Mail-Adresse wird bereits von einem anderen Benutzer verwendet.' }
        const { error: ae } = await admin.auth.admin.updateUserById(id, { email, email_confirm: true })
        if (ae) return { fehler: `E-Mail konnte nicht geändert werden: ${ae.message}` }
      }
      const { error: pe } = await admin.from('profiles').update({ vorname: f('vorname'), nachname: f('nachname'), email, funktion: f('funktion') || null, fraktion: f('fraktion') || null }).eq('id', id)
      if (pe) return { fehler: pe.message }
      revalidatePath('/verwaltung/mitglieder')
      return { ok: true, info: 'Benutzerdaten gespeichert.' }
    } else if (was === 'passwort') {
      // Start-Passwort für ein Verwaltungs-Konto setzen (Passwort-Anmeldung nur für Verwaltung/Superadmin)
      if (!zielRolle || !canAdmin(zielRolle as Rolle)) return { fehler: 'Passwörter gibt es nur für Verwaltungs-Konten; Mitglieder melden sich mit dem Einmal-Code an.' }
      const pw = String(form.get('passwort') ?? '')
      if (pw.length < 10) return { fehler: 'Das Passwort muss mindestens 10 Zeichen lang sein.' }
      const { error: pe } = await admin.auth.admin.updateUserById(id, { password: pw, email_confirm: true })
      if (pe) return { fehler: pe.message }
      return { ok: true, info: 'Passwort gesetzt – die Person kann sich ab sofort mit E-Mail und Passwort anmelden.' }
    } else if (was === 'einladung') {
      const { data: p } = await admin.from('profiles').select('email').eq('id', id).maybeSingle()
      if (!p) return { fehler: 'Benutzer nicht gefunden.' }
      // Konto ggf. bestätigen (Altbestand aus Einladungs-Variante), sonst lehnt Supabase den Code-Versand ab
      await admin.auth.admin.updateUserById(id, { email_confirm: true }).catch(() => null)
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
    const { data, error } = await (supabase.from('sitzungen') as R).insert({
      gremium_id: f('gremium_id'), datum: f('datum'), uhrzeit: f('uhrzeit') || null, ort: f('ort') || null,
      titel: f('titel'), nummer: f('nummer') ? Number(f('nummer')) : null,
      notiz: f('notiz') || null, erstellt_von: ich.id,
    }).select('id').single()
    if (error) return { fehler: error.message }
    revalidatePath('/verwaltung/sitzungen'); revalidatePath('/protokolle', 'layout'); revalidatePath('/portal')
    return { ok: true, info: 'Sitzung angelegt.', id: (data as R).id }
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
export async function protokollRegistrierenAction(d: { sitzung_id: string; dateiname: string; storage_pfad: string; groesse: number; mime: string; typ: 'protokoll' | 'beilage' | 'einladung'; freigegeben: boolean }): Promise<AktionState> {
  try {
    const ich = await uploadPflicht()
    const supabase = await createSupabaseServerClient()
    if (d.typ === 'einladung') {
      // nur eine offizielle Einladung je Sitzung: bisherige ersetzen; Einladung ist immer freigegeben
      const { data: alt } = await supabase.from('protokolle').select('id, storage_pfad').eq('sitzung_id', d.sitzung_id).eq('typ', 'einladung')
      for (const a of (alt ?? []) as R[]) {
        await supabase.storage.from('protokolle').remove([a.storage_pfad])
        await supabase.from('protokolle').delete().eq('id', a.id)
      }
      d.freigegeben = true
    }
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

// ── Sitzungseinladung mit Nachweis ──────────────────────────────────────────
/** Offizielle Einladung (PDF) der Sitzung als Mailanhang laden – null, wenn keine hinterlegt ist */
async function ladeEinladungsAnhang(sitzungId: string): Promise<{ filename: string; content: Buffer; contentType: string } | null> {
  const admin = createSupabaseAdminClient()
  const { data: doc } = await admin.from('protokolle').select('dateiname, storage_pfad').eq('sitzung_id', sitzungId).eq('typ', 'einladung').maybeSingle()
  if (!doc) return null
  const { data: blob, error } = await admin.storage.from('protokolle').download((doc as R).storage_pfad)
  if (error || !blob) { console.error('Einladungs-PDF konnte nicht geladen werden', error); return null }
  return { filename: (doc as R).dateiname, content: Buffer.from(await blob.arrayBuffer()), contentType: 'application/pdf' }
}

/**
 * Einladung versenden: RPC legt Einladungen für alle (noch nicht eingeladenen) Mitglieder des Gremiums an und
 * öffnet das Zugriffsfenster bis 24:00 des Sitzungstags. Danach je Mitglied eine persönliche Mail mit Token-Link.
 * Mehrfach aufrufbar → nachträglich aufgenommene Mitglieder erhalten ihre Einladung.
 */
export async function sitzungEinladenAction(id: string): Promise<AktionState> {
  try {
    const ich = await uploadPflicht()
    const supabase = await createSupabaseServerClient()
    const { data: s } = await (supabase.from('sitzungen') as R)
      .select('id, titel, datum, uhrzeit, ort, gremien(name), protokolle(freigegeben)').eq('id', id).maybeSingle()
    if (!s) return { fehler: 'Sitzung nicht gefunden.' }

    const { data: neue, error } = await supabase.rpc('sitzung_einladen', { p_sitzung_id: id })
    if (error) return { fehler: error.message }
    const liste = (neue ?? []) as R[]
    if (liste.length === 0) {
      revalidatePath('/verwaltung/sitzungen'); revalidatePath('/protokolle', 'layout'); revalidatePath('/portal')
      return { ok: true, info: 'Keine neuen Mitglieder – alle aktiven Mitglieder des Gremiums wurden bereits eingeladen.' }
    }

    const admin = createSupabaseAdminClient()
    const basis = process.env.NEXT_PUBLIC_APP_URL ?? ''
    const anzahlDokumente = ((s.protokolle ?? []) as R[]).filter(p => p.freigegeben).length
    const anhang = await ladeEinladungsAnhang(id)
    let gesendet = 0, fehler = 0
    for (const e of liste) {
      const mail = baueEinladungsmail({
        anrede: `Guten Tag ${e.vorname} ${e.nachname},`.replace(/\s+,/, ','),
        gremium: s.gremien?.name ?? '', titel: s.titel, datum: s.datum, uhrzeit: s.uhrzeit, ort: s.ort,
        anzahlDokumente, link: `${basis}/einladung/${e.token}`, anhangName: anhang?.filename, kontrolle: !!e.kontrolle,
      })
      const r = await sendeMailMitFehler(e.email, mail.betreff, mail.text, mail.html, anhang ? [anhang] : [])
      await admin.from('sitzungs_einladungen').update(r.ok ? { gesendet_am: new Date().toISOString(), mail_fehler: null } : { mail_fehler: r.fehler ?? 'unbekannt' }).eq('id', e.einladung_id)
      await admin.from('zugriffs_log').insert({ user_id: e.user_id, sitzung_id: id, aktion: 'einladung' })
      if (r.ok) gesendet++; else fehler++
    }
    void ich
    revalidatePath('/verwaltung/sitzungen'); revalidatePath('/protokolle', 'layout'); revalidatePath('/portal')
    return fehler
      ? { ok: true, info: `${gesendet} Einladung(en) versendet (inkl. Kontrollkopie an die Verwaltung), ${fehler} fehlgeschlagen – Details in der Nachweisliste.` }
      : { ok: true, info: `${gesendet} Einladung(en) versendet, inkl. Kontrollkopie an die Verwaltung. Zugriff bis 24:00 Uhr am Sitzungstag.` }
  } catch (e) { return { fehler: (e as Error).message } }
}

/** Einzelne Einladung erneut senden (z. B. nach Mailfehler oder auf Nachfrage) */
export async function einladungErneutSendenAction(einladungId: string): Promise<AktionState> {
  try {
    await uploadPflicht()
    const admin = createSupabaseAdminClient()
    const { data: e } = await (admin.from('sitzungs_einladungen') as R)
      .select('id, token, user_id, kontrolle, profiles(email, vorname, nachname), sitzungen(id, titel, datum, uhrzeit, ort, status, zugriff_bis, gremien(name), protokolle(freigegeben))')
      .eq('id', einladungId).maybeSingle()
    if (!e) return { fehler: 'Einladung nicht gefunden.' }
    if (e.sitzungen.status !== 'eingeladen' || new Date(e.sitzungen.zugriff_bis).getTime() <= Date.now()) return { fehler: 'Das Zugriffsfenster ist nicht (mehr) offen.' }
    const anhang = await ladeEinladungsAnhang(e.sitzungen.id)
    const mail = baueEinladungsmail({
      anrede: `Guten Tag ${e.profiles.vorname} ${e.profiles.nachname},`,
      gremium: e.sitzungen.gremien?.name ?? '', titel: e.sitzungen.titel, datum: e.sitzungen.datum, uhrzeit: e.sitzungen.uhrzeit, ort: e.sitzungen.ort,
      anzahlDokumente: ((e.sitzungen.protokolle ?? []) as R[]).filter(p => p.freigegeben).length,
      link: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/einladung/${e.token}`, anhangName: anhang?.filename, kontrolle: !!e.kontrolle,
    })
    const r = await sendeMailMitFehler(e.profiles.email, mail.betreff, mail.text, mail.html, anhang ? [anhang] : [])
    await admin.from('sitzungs_einladungen').update(r.ok ? { gesendet_am: new Date().toISOString(), mail_fehler: null } : { mail_fehler: r.fehler ?? 'unbekannt' }).eq('id', einladungId)
    await admin.from('zugriffs_log').insert({ user_id: e.user_id, sitzung_id: e.sitzungen.id, aktion: 'einladung' })
    revalidatePath('/verwaltung/sitzungen')
    return r.ok ? { ok: true, info: `Einladung erneut an ${e.profiles.email} gesendet.` } : { fehler: `Versand fehlgeschlagen: ${r.fehler}` }
  } catch (e) { return { fehler: (e as Error).message } }
}

/** Zugriff vorzeitig beenden (z. B. Sitzung abgesagt) */
export async function sitzungZugriffBeendenAction(id: string): Promise<AktionState> {
  try {
    await uploadPflicht()
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.rpc('sitzung_zugriff_beenden', { p_sitzung_id: id })
    if (error) return { fehler: error.message }
    revalidatePath('/verwaltung/sitzungen'); revalidatePath('/protokolle', 'layout'); revalidatePath('/portal')
    return { ok: true, info: 'Zugriff beendet – Mitglieder sehen die Unterlagen nicht mehr.' }
  } catch (e) { return { fehler: (e as Error).message } }
}

/** Einladung zurückziehen (nur solange niemand bestätigt hat) → Sitzung wieder Entwurf */
export async function sitzungZurueckziehenAction(id: string): Promise<AktionState> {
  try {
    await verwaltungPflicht()
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.rpc('sitzung_zurueckziehen', { p_sitzung_id: id })
    if (error) return { fehler: error.message }
    revalidatePath('/verwaltung/sitzungen'); revalidatePath('/protokolle', 'layout'); revalidatePath('/portal')
    return { ok: true, info: 'Einladung zurückgezogen – Sitzung ist wieder ein Entwurf.' }
  } catch (e) { return { fehler: (e as Error).message } }
}

// ── Gremien ─────────────────────────────────────────────────────────────────
function schluesselAus(name: string) {
  return name.toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}

export async function gremiumAnlegenAction(form: FormData): Promise<AktionState> {
  try {
    await verwaltungPflicht()
    const f = (k: string) => String(form.get(k) ?? '').trim()
    if (!f('name') || !f('kurz')) return { fehler: 'Name und Kürzel sind Pflicht.' }
    const schluessel = schluesselAus(f('name'))
    if (!schluessel) return { fehler: 'Aus dem Namen lässt sich kein Schlüssel bilden.' }
    const supabase = await createSupabaseServerClient()
    const { data: max } = await supabase.from('gremien').select('sortierung').order('sortierung', { ascending: false }).limit(1).maybeSingle()
    const sortierung = f('sortierung') ? Number(f('sortierung')) : ((max as R | null)?.sortierung ?? 0) + 1
    const { error } = await supabase.from('gremien').insert({ schluessel, name: f('name'), kurz: f('kurz'), sortierung, aktiv: true })
    if (error) return { fehler: /duplicate|unique/i.test(error.message) ? 'Ein Gremium mit diesem Namen/Schlüssel gibt es bereits.' : error.message }
    revalidatePath('/', 'layout')
    return { ok: true, info: `Gremium „${f('name')}" angelegt.` }
  } catch (e) { return { fehler: (e as Error).message } }
}

export async function gremiumSpeichernAction(form: FormData): Promise<AktionState> {
  try {
    await verwaltungPflicht()
    const f = (k: string) => String(form.get(k) ?? '').trim()
    if (!f('id') || !f('name') || !f('kurz')) return { fehler: 'Name und Kürzel sind Pflicht.' }
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('gremien').update({ name: f('name'), kurz: f('kurz'), sortierung: f('sortierung') ? Number(f('sortierung')) : 0 }).eq('id', f('id'))
    if (error) return { fehler: error.message }
    revalidatePath('/', 'layout')
    return { ok: true, info: 'Gremium gespeichert.' }
  } catch (e) { return { fehler: (e as Error).message } }
}

export async function gremiumAktivAction(id: string, aktiv: boolean): Promise<AktionState> {
  try {
    await verwaltungPflicht()
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.from('gremien').update({ aktiv }).eq('id', id)
    if (error) return { fehler: error.message }
    revalidatePath('/', 'layout')
    return { ok: true, info: aktiv ? 'Gremium aktiviert.' : 'Gremium deaktiviert – bestehende Sitzungen und Zuordnungen bleiben erhalten.' }
  } catch (e) { return { fehler: (e as Error).message } }
}

export async function gremiumLoeschenAction(id: string): Promise<AktionState> {
  try {
    await verwaltungPflicht()
    const supabase = await createSupabaseServerClient()
    const [{ count: s }, { count: m }] = await Promise.all([
      supabase.from('sitzungen').select('id', { count: 'exact', head: true }).eq('gremium_id', id),
      supabase.from('mitglied_gremien').select('user_id', { count: 'exact', head: true }).eq('gremium_id', id),
    ])
    if ((s ?? 0) > 0 || (m ?? 0) > 0) return { fehler: 'Gremium hat noch Sitzungen oder Mitglieder – bitte stattdessen deaktivieren.' }
    const { error } = await supabase.from('gremien').delete().eq('id', id)
    if (error) return { fehler: error.message }
    revalidatePath('/', 'layout')
    return { ok: true, info: 'Gremium gelöscht.' }
  } catch (e) { return { fehler: (e as Error).message } }
}
