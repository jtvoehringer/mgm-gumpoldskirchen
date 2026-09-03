-- ============================================================================
-- 006 – Kontrollkopie der Sitzungseinladung an die Gemeindeverwaltung:
--       gleiche Mail wie die Mitglieder (inkl. Anhang und „JA, ich möchte zugreifen"),
--       in der Nachweisliste getrennt ausgewiesen und nicht mitgezählt.
-- ============================================================================
alter table public.sitzungs_einladungen add column if not exists kontrolle boolean not null default false;

drop function if exists public.sitzung_einladen(uuid);
create function public.sitzung_einladen(p_sitzung_id uuid)
returns table (einladung_id uuid, user_id uuid, email text, vorname text, nachname text, token text, kontrolle boolean)
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
       set status = 'eingeladen', eingeladen_am = now(), eingeladen_von = auth.uid(), zugriff_beendet_am = null,
           zugriff_bis = ((v_s.datum + 1)::timestamp at time zone 'Europe/Vienna')
     where id = p_sitzung_id;
  elsif v_s.zugriff_bis <= now() then
    raise exception 'Das Zugriffsfenster dieser Sitzung ist bereits abgelaufen.';
  end if;

  return query
    insert into public.sitzungs_einladungen (sitzung_id, user_id, token, kontrolle)
    select p_sitzung_id, p.id, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), (p.rolle = 'verwaltung')
      from public.profiles p
     where p.aktiv
       and (
         (p.rolle = 'mitglied' and exists (select 1 from public.mitglied_gremien mg where mg.user_id = p.id and mg.gremium_id = v_s.gremium_id))
         or p.rolle = 'verwaltung'   -- Kontrollkopie
       )
       and not exists (select 1 from public.sitzungs_einladungen e where e.sitzung_id = p_sitzung_id and e.user_id = p.id)
    returning sitzungs_einladungen.id, sitzungs_einladungen.user_id,
              (select pp.email from public.profiles pp where pp.id = sitzungs_einladungen.user_id),
              (select pp.vorname from public.profiles pp where pp.id = sitzungs_einladungen.user_id),
              (select pp.nachname from public.profiles pp where pp.id = sitzungs_einladungen.user_id),
              sitzungs_einladungen.token, sitzungs_einladungen.kontrolle;
end $$;
revoke execute on function public.sitzung_einladen(uuid) from public, anon;
grant  execute on function public.sitzung_einladen(uuid) to authenticated;
