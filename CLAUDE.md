# Sitzungsunterlagen Gumpoldskirchen – Hinweise für Claude

- Sprache im Code und UI: Deutsch (österreichisch, „Jänner"), Benutzer werden gesiezt (Gemeinde-Kontext).
- Design strikt nach `tailwind.config.ts` (Präfix `gk`) und CD-Manual: Logo nur Dunkelblau oder Weiß, Headlines Versalien (`.headline`), grüner Balken unter der Kopfleiste, flache weiße Karten mit 1-px-Rand, Mono-Schrift für Zahlen/Labels (`.eyebrow`, `.kpi`, `.badge`).
- Kein automatischer Zugang und kein öffentlicher Zugangsantrag mehr (02.09.2026 entfernt, Tabelle `zugangsantraege` bleibt ungenutzt): Benutzer entstehen ausschließlich in `benutzerFreigeben()` (`src/app/(portal)/verwaltung/actions.ts`) über den Service-Role-Client. `shouldCreateUser: false` beim Login beibehalten.
- Berechtigungen liegen in der DB (RLS + Funktionen `meine_rolle`, `darf_gremium_lesen`, `darf_hochladen`), die Seiten prüfen zusätzlich über `getProfil()`. Neue Tabellen immer mit RLS.
- Uploads: Browser → Storage-Bucket `protokolle` (Pfad `<gremium>/<jahr>/<sitzung_id>/<datei>`), danach `protokollRegistrierenAction`. Nie Dateien durch Server Actions schleusen (Vercel-Limit).
- Migrationen nummeriert in `supabase/migrations/`, per Supabase-MCP (`apply_migration`) einspielen, Projekt-Ref `tqkldsdcffeotxeesnen`.
- Lieferweg: geänderte Dateien direkt in den Projektordner schreiben; Jörgen pusht mit `push.ps1`.
- Sitzungsworkflow (Migration 002): Sitzung = Entwurf → Unterlagen hochladen/freigeben → `sitzungEinladenAction` (RPC `sitzung_einladen`:
  Status `eingeladen`, `zugriff_bis` = 24:00 Europe/Vienna am Sitzungstag, je aktivem Mitglied des Gremiums eine Zeile in
  `sitzungs_einladungen` mit persönlichem Token) → Mail (`lib/einladungsmail.ts`, Link `/einladung/<token>`, öffentlich) →
  Klick „JA, ich möchte zugreifen" setzt `bestaetigt_am` + `zugriffs_log.aktion='bestaetigung'` → Login → Unterlagen.
  Mitglieder sehen Sitzungen/Dokumente/Storage nur über `darf_sitzung_lesen()` (eingeladen und `zugriff_bis > now()`) –
  der Entzug um 24:00 passiert damit RLS-seitig ohne Cron; „abgelaufen" wird in der UI aus `zugriff_bis` abgeleitet (`lib/sitzung-status.ts`).
  Trigger `log_erste_ansicht` trägt `erste_ansicht_am` in der Einladung nach. Nachweis (eingeladen/bestätigt/geöffnet) in /verwaltung/sitzungen.
- Dokumenttypen (Migration 003): `protokoll` | `beilage` | `einladung`. „einladung" = offizielle Einladung mit Tagesordnung (PDF, max. eine je Sitzung,
  immer freigegeben, ersetzt beim Neu-Upload die alte) und wird beim Versand als Mailanhang mitgeschickt (`ladeEinladungsAnhang` in verwaltung/actions.ts).
  Upload in /verwaltung/sitzungen: einzelne PDFs, ganzer Ordner (`webkitdirectory`, nur PDFs, Unterordner inklusive) oder Drag & Drop von Dateien/Ordnern auf die Sitzungskarte.
