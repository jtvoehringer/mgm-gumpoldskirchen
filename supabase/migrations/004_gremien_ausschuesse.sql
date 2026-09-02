-- ============================================================================
-- 004 – Gremien durch die Verwaltung pflegbar (aktiv-Flag) + offizielle Ausschüsse der Marktgemeinde
-- ============================================================================
alter table public.gremien add column if not exists aktiv boolean not null default true;

insert into public.gremien (schluessel, name, kurz, sortierung) values
  ('bauausschuss',         'Bauausschuss',         'BA',   10),
  ('kulturausschuss',      'Kulturausschuss',      'KA',   11),
  ('personalausschuss',    'Personalausschuss',    'PeA',  12),
  ('pruefungsausschuss',   'Prüfungsausschuss',    'PrA',  13),
  ('schulausschuss',       'Schulausschuss',       'SchA', 14),
  ('sozialausschuss',      'Sozialausschuss',      'SoA',  15),
  ('umweltausschuss',      'Umweltausschuss',      'UA',   16),
  ('wirtschaftsausschuss', 'Wirtschaftsausschuss', 'WA',   17)
on conflict (schluessel) do nothing;

-- Reihung: Gemeindevorstand, Gemeinderat, danach Ausschüsse alphabetisch
update public.gremien set sortierung = 1 where schluessel = 'gemeindevorstand';
update public.gremien set sortierung = 2 where schluessel = 'gemeinderat';

drop policy if exists "gremien verwaltung" on public.gremien;
create policy "gremien verwaltung" on public.gremien for all using (public.ist_verwaltung()) with check (public.ist_verwaltung());
