-- ============================================================================
-- 002 – Sitzungsworkflow: Einladung mit Nachweis, befristeter Zugriff bis 24:00 des Sitzungstags
-- Ablauf: Sitzung anlegen (Entwurf) → Unterlagen hochladen/freigeben → „Einladung versenden"
--         → alle Mitglieder des Gremiums erhalten eine persönliche Mail (Token-Link)
--         → Klick auf „JA, ich möchte zugreifen" wird protokolliert
--         → Zugriff endet automatisch um 24:00 (Europe/Vienna) am Sitzungstag (RLS-seitig, kein Cron nötig)
-- ============================================================================

-- ── Sitzungen: Status, Uhrzeit/Ort, Zugriffsfenster ─────────────────────────
alter table public.sitzungen
  add column if not exists status              text not null default 'entwurf' check (status in ('entwurf','eingeladen')),
  add column if not exists uhrzeit             time,
  add column if not exists ort                 text,
  add column if not exists zugriff_bis         timestamptz,   -- Ende des Zugriffsfensters (24:00 Sitzungstag bzw. vorzeitig beendet)
  add column if not exists eingeladen_am       timestamptz,
  add column if not exists eingeladen_von      uuid references public.profiles(id),
  add column if not exists zugriff_beendet_am  timestamptz;

-- ── Einladungen je Sitzung und Mitglied (Nachweis) ──────────────────────────
create table if not exists public.sitzungs_einladungen (
  id             uuid primary key default gen_random_uuid(),
  sitzung_id     uuid not null references public.sitzungen(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  token          text not null unique,          -- persönlicher, geheimer Link-Schlüssel
  erstellt_am    timestamptz not null default now(),
  gesendet_am    timestamptz,                    -- Mail erfolgreich übergeben
  mail_fehler    text,                           -- letzter Fehler beim Versand
  bestaetigt_am  timestamptz,                    -- Klick auf „JA, ich möchte zugreifen"
  erste_ansicht_am timestamptz,                  -- erstes Öffnen eines Dokuments dieser Sitzung
  unique (sitzung_id, user_id)
);
create index if not exists sitzungs_einladungen_sitzung_idx on public.sitzungs_einladungen (sitzung_id);

-- ── Zugriffsprotokoll: Sitzungsbezug + neue Aktionen ────────────────────────
alter table public.zugriffs_log add column if not exists sitzung_id uuid references public.sitzungen(id) on delete set null;
alter table public.zugriffs_log drop constraint if exists zugriffs_log_aktion_check;
alter table public.zugriffs_log add constraint zugriffs_log_aktion_check
  check (aktion in ('ansicht','download','login','einladung','bestaetigung','zugriff_beendet'));
create index if not exists zugriffs_log_sitzung_idx on public.zugriffs_log (sitzung_id);

-- ── Zugriffsfenster ─────────────────────────────────────────────────────────
-- Darf der angemeldete Benutzer diese Sitzung (und ihre Dokumente) sehen?
-- Verwaltung/Schriftführung: immer. Mitglieder: nur im eigenen Gremium, nach Einladung und bis 24:00 des Sitzungstags.
create or replace function public.darf_sitzung_lesen(p_sitzung_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.darf_hochladen()
      or exists (select 1 from public.sitzungen s
                 where s.id = p_sitzung_id
                   and s.status = 'eingeladen'
                   and s.zugriff_bis is not null and s.zugriff_bis > now()
                   and public.darf_gremium_lesen(s.gremium_id))
$$;
revoke execute on function public.darf_sitzung_lesen(uuid) from public, anon;
grant  execute on function public.darf_sitzung_lesen(uuid) to authenticated;

drop policy if exists "sitzungen lesen" on public.sitzungen;
create policy "sitzungen lesen" on public.sitzungen for select using (public.darf_sitzung_lesen(id));

drop policy if exists "protokolle lesen" on public.protokolle;
create policy "protokolle lesen" on public.protokolle for select
  using ((freigegeben or public.darf_hochladen()) and public.darf_sitzung_lesen(sitzung_id));

-- Storage: Pfad <gremium>/<jahr>/<sitzung_id>/<datei> → Sitzungsfenster prüfen
drop policy if exists "protokolle storage lesen" on storage.objects;
create policy "protokolle storage lesen" on storage.objects for select to authenticated
  using (bucket_id = 'protokolle'
         and exists (select 1 from public.sitzungen s
                     where s.id::text = split_part(name, '/', 3) and public.darf_sitzung_lesen(s.id)));

-- ── RLS Einladungen ─────────────────────────────────────────────────────────
alter table public.sitzungs_einladungen enable row level security;
create policy "einladungen lesen" on public.sitzungs_einladungen for select
  using (public.darf_hochladen() or user_id = auth.uid());
-- Schreiben ausschließlich über RPC / Service-Role

-- ── RPC: Einladung versenden (legt Einladungen an, öffnet Zugriffsfenster) ──
-- Liefert die neu angelegten Einladungen (für den Mailversand durch die App).
-- Mehrfach aufrufbar: nachträglich hinzugekommene Mitglieder bekommen so ihre Einladung.
create or replace function public.sitzung_einladen(p_sitzung_id uuid)
returns table (einladung_id uuid, user_id uuid, email text, vorname text, nachname text, token text)
language plpgsql security definer set search_path = public as $$
declare
  v_s public.sitzungen%rowtype;
begin
  if not public.darf_hochladen() then
    raise exception 'Keine Berechtigung.';
  end if;
  select * into v_s from public.sitzungen where id = p_sitzung_id for update;
  if not found then raise exception 'Sitzung nicht gefunden.'; end if;
  if not exists (select 1 from public.protokolle where sitzung_id = p_sitzung_id and freigegeben) then
    raise exception 'Bitte zuerst mindestens ein Dokument freigeben.';
  end if;
  if v_s.datum < current_date then
    raise exception 'Der Sitzungstermin liegt in der Vergangenheit.';
  end if;

  if v_s.status = 'entwurf' then
    update public.sitzungen
       set status = 'eingeladen',
           eingeladen_am = now(),
           eingeladen_von = auth.uid(),
           zugriff_beendet_am = null,
           -- 24:00 des Sitzungstags in Wiener Zeit
           zugriff_bis = ((v_s.datum + 1)::timestamp at time zone 'Europe/Vienna')
     where id = p_sitzung_id;
  elsif v_s.zugriff_bis <= now() then
    raise exception 'Das Zugriffsfenster dieser Sitzung ist bereits abgelaufen.';
  end if;

  return query
    insert into public.sitzungs_einladungen (sitzung_id, user_id, token)
    select p_sitzung_id, p.id, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
      from public.profiles p
      join public.mitglied_gremien mg on mg.user_id = p.id and mg.gremium_id = v_s.gremium_id
     where p.aktiv and p.rolle = 'mitglied'
       and not exists (select 1 from public.sitzungs_einladungen e where e.sitzung_id = p_sitzung_id and e.user_id = p.id)
    returning sitzungs_einladungen.id, sitzungs_einladungen.user_id,
              (select pp.email from public.profiles pp where pp.id = sitzungs_einladungen.user_id),
              (select pp.vorname from public.profiles pp where pp.id = sitzungs_einladungen.user_id),
              (select pp.nachname from public.profiles pp where pp.id = sitzungs_einladungen.user_id),
              sitzungs_einladungen.token;
end $$;
revoke execute on function public.sitzung_einladen(uuid) from public, anon;
grant  execute on function public.sitzung_einladen(uuid) to authenticated;

-- ── RPC: Zugriff vorzeitig beenden ──────────────────────────────────────────
create or replace function public.sitzung_zugriff_beenden(p_sitzung_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.darf_hochladen() then raise exception 'Keine Berechtigung.'; end if;
  update public.sitzungen set zugriff_bis = now(), zugriff_beendet_am = now()
   where id = p_sitzung_id and status = 'eingeladen' and zugriff_bis > now();
  if not found then raise exception 'Sitzung nicht offen.'; end if;
  insert into public.zugriffs_log (user_id, sitzung_id, aktion) values (auth.uid(), p_sitzung_id, 'zugriff_beendet');
end $$;
revoke execute on function public.sitzung_zugriff_beenden(uuid) from public, anon;
grant  execute on function public.sitzung_zugriff_beenden(uuid) to authenticated;

-- ── RPC: Sitzung zurück auf Entwurf (nur solange niemand bestätigt hat) ─────
create or replace function public.sitzung_zurueckziehen(p_sitzung_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.ist_verwaltung() then raise exception 'Keine Berechtigung.'; end if;
  if exists (select 1 from public.sitzungs_einladungen where sitzung_id = p_sitzung_id and bestaetigt_am is not null) then
    raise exception 'Es liegen bereits Bestätigungen vor – Einladung kann nicht zurückgezogen werden. Bitte stattdessen den Zugriff beenden.';
  end if;
  delete from public.sitzungs_einladungen where sitzung_id = p_sitzung_id;
  update public.sitzungen set status = 'entwurf', zugriff_bis = null, eingeladen_am = null, eingeladen_von = null, zugriff_beendet_am = null
   where id = p_sitzung_id;
end $$;
revoke execute on function public.sitzung_zurueckziehen(uuid) from public, anon;
grant  execute on function public.sitzung_zurueckziehen(uuid) to authenticated;

-- Zugriffsprotokoll: Sitzungsbezug auch für Ansichten (erste Ansicht in der Einladung vermerken)
create or replace function public.log_erste_ansicht()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.aktion in ('ansicht','download') and new.protokoll_id is not null then
    select sitzung_id into new.sitzung_id from public.protokolle where id = new.protokoll_id;
    update public.sitzungs_einladungen set erste_ansicht_am = now()
     where sitzung_id = new.sitzung_id and user_id = new.user_id and erste_ansicht_am is null;
  end if;
  return new;
end $$;
drop trigger if exists zugriffs_log_erste_ansicht on public.zugriffs_log;
create trigger zugriffs_log_erste_ansicht before insert on public.zugriffs_log
  for each row execute function public.log_erste_ansicht();
