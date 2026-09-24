# Sitzungsunterlagen Gumpoldskirchen – Hinweise für Claude

- Sprache im Code und UI: Deutsch (österreichisch, „Jänner"), Benutzer werden gesiezt (Gemeinde-Kontext).
- Design strikt nach `tailwind.config.ts` (Präfix `gk`) und CD-Manual: Logo nur Dunkelblau oder Weiß, Headlines Versalien (`.headline`), grüner Balken unter der Kopfleiste, flache weiße Karten mit 1-px-Rand, Mono-Schrift für Zahlen/Labels (`.eyebrow`, `.kpi`, `.badge`).
- Kein automatischer Zugang und kein öffentlicher Zugangsantrag mehr (02.09.2026 entfernt, Tabelle `zugangsantraege` bleibt ungenutzt): Benutzer entstehen ausschließlich in `benutzerFreigeben()` (`src/app/(portal)/verwaltung/actions.ts`) über den Service-Role-Client. `shouldCreateUser: false` beim Login beibehalten.
- Berechtigungen liegen in der DB (RLS + Funktionen `meine_rolle`, `darf_gremium_lesen`, `darf_hochladen`), die Seiten prüfen zusätzlich über `getProfil()`. Neue Tabellen immer mit RLS.
- Uploads: Browser → Storage-Bucket `protokolle` (Pfad `<gremium>/<jahr>/<sitzung_id>/<datei>`), danach `protokollRegistrierenAction`. Nie Dateien durch Server Actions schleusen (Vercel-Limit).
- Migrationen in `supabase/migrations/` heißen `<version>_<name>.sql` mit der Remote-Version (Zeitstempel), Projekt-Ref `tqkldsdcffeotxeesnen`
  (bis 24.09.2026 nummeriert 001–007, dann umbenannt; „Migration 002" usw. unten = diese Dateien in Reihenfolge).
  Einspielen per Supabase-MCP `apply_migration` mit `<name>`, danach die von `list_migrations` gemeldete Version übernehmen und die Datei
  exakt als `<version>_<name>.sql` speichern – keine eigene Nummer oder Zeitstempel erfinden. Prüfen mit `npx supabase migration list` (lokal = remote).
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
- Gremien (Migration 004) sind Daten, kein Code: Tabelle `gremien` mit `aktiv`; Pflege unter /verwaltung/gremien (anlegen, umbenennen, Reihenfolge, deaktivieren;
  löschen nur ohne Sitzungen/Mitglieder). Navigation, Filter, Chips und Auswahlfelder werden aus `ladeGremien()` gebaut (Mitglieder: nur eigene Gremien).
  Reihung lt. Jörgen: Gemeindevorstand (1), Gemeinderat (2), Ausschüsse alphabetisch (ab 10). Keine Gremien-Schlüssel im Code fest verdrahten.
- Reports: `lib/reports.ts` (Abfragen) + `lib/pdf.ts` (eigener, abhängigkeitsfreier Tabellen-PDF-Generator, A4 quer, CD-Kopfleiste; CSV mit Semikolon+BOM).
  Routen: /api/reports/zugriffe?format=csv|pdf&sitzung=&benutzer=&aktion=&von=&bis= (Verwaltung) und /api/reports/nachweis/<sitzung_id>?format=csv|pdf (Upload-Rollen).
  Zeiten immer über `lib/format.ts` ausgeben (rechnet nach Europe/Vienna um – Vercel läuft in UTC).
- Rollen (Migration 005): `superadmin` (ICP-Support, Jörgen) = alle Rechte der Verwaltung (`canAdmin`); die Verwaltung sieht ihn als Badge und kann ihn
  nur aktivieren/deaktivieren (Schild-Icons), Rolle/Daten nicht ändern; nur ein Superadmin kann die Rolle superadmin vergeben. Benutzer anlegen
  verschickt KEINE Mail mehr (`auth.admin.createUser` mit email_confirm) – Anmelde-Link auf Wunsch über das Senden-Symbol (signInWithOtp).
- Passwort-Anmeldung (03.09.2026): nur für Rollen verwaltung/superadmin – Login-Seite „Anmeldung mit Passwort", eigenes Passwort im Profil
  (`passwortSetzenAction`, min. 10 Zeichen), Start-Passwort durch Verwaltung im Mitglieder-Screen (Schlüssel-Icon, `was='passwort'`).
  Mitglieder bleiben beim Einmal-Code. Konten aus der alten Einladungs-Variante müssen `email_confirmed_at` haben, sonst „Signups not allowed" beim Code.
- Kontrollkopie (Migration 006): `sitzung_einladen` legt zusätzlich für alle aktiven `verwaltung`-Konten eine Einladung mit `kontrolle = true` an →
  gleiche Mail (Betreff „Kontrollkopie – …", Hinweisbalken, Anhang, JA-Button). In Nachweisliste/Report getrennt ausgewiesen und nicht mitgezählt.
