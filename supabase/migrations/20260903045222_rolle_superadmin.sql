-- ============================================================================
-- 005 – Rolle "superadmin" (ICP-Support): alle Rechte der Gemeindeverwaltung.
--       Die Verwaltung kann den Superadmin bei Bedarf deaktivieren/aktivieren (Support-Zugang).
-- ============================================================================
alter table public.profiles drop constraint if exists profiles_rolle_check;
alter table public.profiles add constraint profiles_rolle_check check (rolle in ('superadmin','verwaltung','schriftfuehrung','mitglied'));

create or replace function public.ist_verwaltung()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.meine_rolle() in ('superadmin','verwaltung'), false)
$$;

create or replace function public.darf_hochladen()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.meine_rolle() in ('superadmin','verwaltung','schriftfuehrung'), false)
$$;

update public.profiles set rolle = 'superadmin' where email = 'jv@icp-consultants.at';
