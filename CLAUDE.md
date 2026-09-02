# Sitzungsprotokolle Gumpoldskirchen – Hinweise für Claude

- Sprache im Code und UI: Deutsch (österreichisch, „Jänner"), Benutzer werden gesiezt (Gemeinde-Kontext).
- Design strikt nach `tailwind.config.ts` (Präfix `gk`) und CD-Manual: Logo nur Dunkelblau oder Weiß, Headlines Versalien (`.headline`), grüner Balken unter der Kopfleiste, flache weiße Karten mit 1-px-Rand, Mono-Schrift für Zahlen/Labels (`.eyebrow`, `.kpi`, `.badge`).
- Kein automatischer Zugang: Benutzer entstehen ausschließlich in `benutzerFreigeben()` (`src/app/(portal)/verwaltung/actions.ts`) über den Service-Role-Client. `shouldCreateUser: false` beim Login beibehalten.
- Berechtigungen liegen in der DB (RLS + Funktionen `meine_rolle`, `darf_gremium_lesen`, `darf_hochladen`), die Seiten prüfen zusätzlich über `getProfil()`. Neue Tabellen immer mit RLS.
- Uploads: Browser → Storage-Bucket `protokolle` (Pfad `<gremium>/<jahr>/<sitzung_id>/<datei>`), danach `protokollRegistrierenAction`. Nie Dateien durch Server Actions schleusen (Vercel-Limit).
- Migrationen nummeriert in `supabase/migrations/`, per Supabase-MCP (`apply_migration`) einspielen, Projekt-Ref `tqkldsdcffeotxeesnen`.
- Lieferweg: geänderte Dateien direkt in den Projektordner schreiben; Jörgen pusht mit `push.ps1`.
