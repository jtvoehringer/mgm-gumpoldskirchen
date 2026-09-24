-- ============================================================================
-- 003 – Dokumenttyp „einladung": offizielle Einladung mit Tagesordnung (PDF),
--       wird der Einladungsmail als Anhang beigefügt. Höchstens eine je Sitzung.
-- ============================================================================
alter table public.protokolle drop constraint if exists protokolle_typ_check;
alter table public.protokolle add constraint protokolle_typ_check check (typ in ('protokoll','beilage','einladung'));
create unique index if not exists protokolle_einladung_je_sitzung on public.protokolle (sitzung_id) where typ = 'einladung';
