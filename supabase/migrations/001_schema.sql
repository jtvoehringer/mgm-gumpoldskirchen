-- ============================================================================
-- Sitzungsprotokolle Marktgemeinde Gumpoldskirchen – Grundschema
-- Ausführen im Supabase SQL Editor (einmalig, in dieser Reihenfolge).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Gremien ─────────────────────────────────────────────────────────────────
create table if not exists public.gremien (
  id          uuid primary key default gen_random_uuid(),
  schluessel  text not null unique,           -- 'gemeinderat' | 'gemeindevorstand'
  name        text not null,
  kurz        text not null,
  sortierung  int  not null default 0
);

insert into public.gremien (schluessel, name, kurz, sortierung) values
  ('gemeinderat',      'Gemeinderat',      'GR', 1),
  ('gemeindevorstand', 'Gemeindevorstand', 'GV', 2)
on conflict (schluessel) do nothing;

-- ── Profile (1:1 zu auth.users) ─────────────────────────────────────────────
-- rolle: verwaltung (Admin, Freigaben, Upload) · schriftfuehrung (Upload) · mitglied (Leser)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  vorname     text not null default '',
  nachname    text not null default '',
  funktion    text,                             -- z. B. Gemeinderat, Vizebürgermeisterin
  fraktion    text,
  rolle       text not null default 'mitglied' check (rolle in ('verwaltung','schriftfuehrung','mitglied')),
  aktiv       boolean not null default true,    -- false = Zugriff entzogen
  erstellt_am timestamptz not null default now(),
  letzter_login timestamptz
);

-- Zugriff je Gremium (nur für rolle = mitglied relevant; Verwaltung/Schriftführung sehen alles)
create table if not exists public.mitglied_gremien (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  gremium_id uuid not null references public.gremien(id) on delete cascade,
  primary key (user_id, gremium_id)
);

-- ── Zugangsanträge (öffentlich einreichbar, manuell zu entscheiden) ─────────
create table if not exists public.zugangsantraege (
  id              uuid primary key default gen_random_uuid(),
  vorname         text not null,
  nachname        text not null,
  email           text not null,
  telefon         text,
  funktion        text not null,
  fraktion        text,
  gremien         text[] not null default '{}',   -- Schlüssel der gewünschten Gremien
  nachricht       text,
  status          text not null default 'offen' check (status in ('offen','genehmigt','abgelehnt')),
  begruendung     text,                           -- interne Notiz der Verwaltung
  erstellt_am     timestamptz not null default now(),
  entschieden_am  timestamptz,
  entschieden_von uuid references public.profiles(id),
  user_id         uuid references public.profiles(id)  -- nach Genehmigung angelegter Benutzer
);
create index if not exists zugangsantraege_status_idx on public.zugangsantraege(status, erstellt_am desc);

-- ── Sitzungen und Protokolle ────────────────────────────────────────────────
create table if not exists public.sitzungen (
  id          uuid primary key default gen_random_uuid(),
  gremium_id  uuid not null references public.gremien(id),
  datum       date not null,
  titel       text not null,                    -- z. B. „12. Sitzung des Gemeinderats"
  nummer      int,
  notiz       text,
  erstellt_von uuid references public.profiles(id),
  erstellt_am timestamptz not null default now()
);
create index if not exists sitzungen_gremium_datum_idx on public.sitzungen(gremium_id, datum desc);

create table if not exists public.protokolle (
  id              uuid primary key default gen_random_uuid(),
  sitzung_id      uuid not null references public.sitzungen(id) on delete cascade,
  dateiname       text not null,
  storage_pfad    text not null unique,         -- Pfad im Bucket „protokolle"
  groesse         bigint,
  mime            text,
  typ             text not null default 'protokoll' check (typ in ('protokoll','beilage')),
  freigegeben     boolean not null default false, -- erst nach Freigabe für Mitglieder sichtbar
  hochgeladen_von uuid references public.profiles(id),
  hochgeladen_am  timestamptz not null default now()
);
create index if not exists protokolle_sitzung_idx on public.protokolle(sitzung_id);

-- ── Zugriffsprotokoll ───────────────────────────────────────────────────────
create table if not exists public.zugriffs_log (
  id           bigserial primary key,
  user_id      uuid references public.profiles(id) on delete set null,
  protokoll_id uuid references public.protokolle(id) on delete set null,
  aktion       text not null check (aktion in ('ansicht','download','login')),
  zeitpunkt    timestamptz not null default now()
);
create index if not exists zugriffs_log_zeit_idx on public.zugriffs_log(zeitpunkt desc);

-- ── Hilfsfunktionen ─────────────────────────────────────────────────────────
create or replace function public.meine_rolle()
returns text language sql stable security definer set search_path = public as $$
  select rolle from public.profiles where id = auth.uid() and aktiv
$$;
revoke execute on function public.meine_rolle() from public, anon;
grant  execute on function public.meine_rolle() to authenticated;

create or replace function public.ist_verwaltung()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.meine_rolle() = 'verwaltung', false)
$$;
revoke execute on function public.ist_verwaltung() from public, anon;
grant  execute on function public.ist_verwaltung() to authenticated;

create or replace function public.darf_hochladen()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.meine_rolle() in ('verwaltung','schriftfuehrung'), false)
$$;
revoke execute on function public.darf_hochladen() from public, anon;
grant  execute on function public.darf_hochladen() to authenticated;

-- Darf der angemeldete Benutzer Protokolle dieses Gremiums lesen?
create or replace function public.darf_gremium_lesen(p_gremium_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.darf_hochladen()
      or exists (select 1 from public.mitglied_gremien mg
                 join public.profiles p on p.id = mg.user_id
                 where mg.user_id = auth.uid() and mg.gremium_id = p_gremium_id and p.aktiv)
$$;
revoke execute on function public.darf_gremium_lesen(uuid) from public, anon;
grant  execute on function public.darf_gremium_lesen(uuid) to authenticated;

-- ── Öffentlicher Antrag (RPC für anon; schreibt kontrolliert in zugangsantraege) ──
create or replace function public.stelle_zugangsantrag(
  p_vorname text, p_nachname text, p_email text, p_telefon text,
  p_funktion text, p_fraktion text, p_gremien text[], p_nachricht text
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if length(trim(p_vorname)) < 2 or length(trim(p_nachname)) < 2 then
    raise exception 'Bitte Vor- und Nachname angeben.';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Bitte eine gültige E-Mail-Adresse angeben.';
  end if;
  if coalesce(array_length(p_gremien, 1), 0) = 0 then
    raise exception 'Bitte mindestens ein Gremium auswählen.';
  end if;
  if not (p_gremien <@ (select array_agg(schluessel) from public.gremien)) then
    raise exception 'Unbekanntes Gremium.';
  end if;
  if exists (select 1 from public.zugangsantraege where email = v_email and status = 'offen') then
    raise exception 'Für diese E-Mail-Adresse liegt bereits ein offener Antrag vor.';
  end if;
  -- einfache Missbrauchsbremse: max. 20 Anträge pro Stunde insgesamt
  if (select count(*) from public.zugangsantraege where erstellt_am > now() - interval '1 hour') >= 20 then
    raise exception 'Derzeit sind keine weiteren Anträge möglich. Bitte später erneut versuchen.';
  end if;
  insert into public.zugangsantraege (vorname, nachname, email, telefon, funktion, fraktion, gremien, nachricht)
  values (trim(p_vorname), trim(p_nachname), v_email, nullif(trim(p_telefon), ''), trim(p_funktion),
          nullif(trim(p_fraktion), ''), p_gremien, nullif(trim(p_nachricht), ''))
  returning id into v_id;
  return v_id;
end $$;
revoke execute on function public.stelle_zugangsantrag(text,text,text,text,text,text,text[],text) from public;
grant  execute on function public.stelle_zugangsantrag(text,text,text,text,text,text,text[],text) to anon, authenticated;

-- Öffentliche Liste der Gremien (für das Antragsformular)
grant select on public.gremien to anon, authenticated;

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.gremien          enable row level security;
alter table public.profiles         enable row level security;
alter table public.mitglied_gremien enable row level security;
alter table public.zugangsantraege  enable row level security;
alter table public.sitzungen        enable row level security;
alter table public.protokolle       enable row level security;
alter table public.zugriffs_log     enable row level security;

create policy "gremien lesen"        on public.gremien for select using (true);

create policy "profil eigenes lesen" on public.profiles for select using (id = auth.uid() or public.ist_verwaltung());
create policy "profil eigenes aendern" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and rolle = public.meine_rolle() and aktiv);
create policy "profil verwaltung"    on public.profiles for all using (public.ist_verwaltung()) with check (public.ist_verwaltung());

create policy "mg lesen"             on public.mitglied_gremien for select using (user_id = auth.uid() or public.ist_verwaltung());
create policy "mg verwaltung"        on public.mitglied_gremien for all using (public.ist_verwaltung()) with check (public.ist_verwaltung());

create policy "antraege verwaltung"  on public.zugangsantraege for all using (public.ist_verwaltung()) with check (public.ist_verwaltung());

create policy "sitzungen lesen"      on public.sitzungen for select using (public.darf_gremium_lesen(gremium_id));
create policy "sitzungen schreiben"  on public.sitzungen for all using (public.darf_hochladen()) with check (public.darf_hochladen());

create policy "protokolle lesen"     on public.protokolle for select
  using ((freigegeben or public.darf_hochladen())
         and exists (select 1 from public.sitzungen s where s.id = sitzung_id and public.darf_gremium_lesen(s.gremium_id)));
create policy "protokolle schreiben" on public.protokolle for all using (public.darf_hochladen()) with check (public.darf_hochladen());

create policy "log eigenes schreiben" on public.zugriffs_log for insert with check (user_id = auth.uid());
create policy "log lesen"             on public.zugriffs_log for select using (public.ist_verwaltung() or user_id = auth.uid());

-- ── Storage: privater Bucket „protokolle" ───────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('protokolle', 'protokolle', false, 52428800, array['application/pdf'])
on conflict (id) do nothing;

-- Pfadschema: <gremium_schluessel>/<jahr>/<sitzung_id>/<dateiname>
create policy "protokolle storage lesen" on storage.objects for select to authenticated
  using (bucket_id = 'protokolle' and public.darf_gremium_lesen(
    (select id from public.gremien where schluessel = split_part(name, '/', 1))));
create policy "protokolle storage schreiben" on storage.objects for insert to authenticated
  with check (bucket_id = 'protokolle' and public.darf_hochladen());
create policy "protokolle storage loeschen" on storage.objects for delete to authenticated
  using (bucket_id = 'protokolle' and public.darf_hochladen());

-- ── Ersten Verwaltungs-Benutzer anlegen ─────────────────────────────────────
-- 1) Im Supabase Dashboard unter Authentication → Users den Benutzer per E-Mail einladen.
-- 2) Danach hier eintragen (E-Mail anpassen):
-- insert into public.profiles (id, email, vorname, nachname, rolle)
-- select id, email, 'Vorname', 'Nachname', 'verwaltung' from auth.users where email = 'verwaltung@gumpoldskirchen.at'
-- on conflict (id) do update set rolle = 'verwaltung', aktiv = true;
