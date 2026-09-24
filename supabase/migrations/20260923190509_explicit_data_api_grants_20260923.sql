-- 007 – Explizite Data-API-Grants (remote: 20260923190509_explicit_data_api_grants_20260923)
-- Explizite Data-API-Grants (Supabase-Änderung ab 30.10.2026).
-- Spiegelt den Grant-Stand vom 23.09.2026, damit ein Neuaufbau aus den Migrationen
-- (Branch, db reset, neues Projekt) dieselben Rechte erhält. Idempotent.
do $g$
declare t text;
begin
  foreach t in array array['gremien','mitglied_gremien','profiles','protokolle','sitzungen','sitzungs_einladungen','zugangsantraege','zugriffs_log']::text[] loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('grant select, insert, update, delete, truncate, references, trigger on table public.%I to anon, authenticated, service_role', t);
    end if;
  end loop;
  if to_regclass('public.zugriffs_log_id_seq') is not null then execute 'grant SELECT, UPDATE, USAGE on sequence public.zugriffs_log_id_seq to anon'; end if;
  if to_regclass('public.zugriffs_log_id_seq') is not null then execute 'grant SELECT, UPDATE, USAGE on sequence public.zugriffs_log_id_seq to authenticated'; end if;
  if to_regclass('public.zugriffs_log_id_seq') is not null then execute 'grant SELECT, UPDATE, USAGE on sequence public.zugriffs_log_id_seq to service_role'; end if;
end $g$;
