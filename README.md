# Sitzungsprotokolle · Marktgemeinde Gumpoldskirchen

Web-Portal zur digitalen Bereitstellung der Sitzungsprotokolle von Gemeinderat und Gemeindevorstand.
Zugang wird von Gemeinderäten beantragt und von der Gemeindeverwaltung **manuell** freigegeben – nie automatisch.

## Stack
- Next.js 16 (App Router, Server Actions), Tailwind CSS 3
- Supabase (Postgres mit Row Level Security, Auth per E-Mail-Code/Magic-Link, privater Storage-Bucket `protokolle`)
- Gestaltung nach dem CD-Manual der Marktgemeinde (Dunkelblau #004B72, Hellgrün #A8C959, Weinrot #9F456D; Libre Franklin + Barlow Condensed als freie Alternative zum lizenzpflichtigen Corporate Font „Verb")

## Rollen
| Rolle | Rechte |
|---|---|
| `verwaltung` | Anträge freigeben/ablehnen, Mitglieder verwalten, Zugriff entziehen, Sitzungen & Upload, Zugriffsprotokoll |
| `schriftfuehrung` | Sitzungen anlegen, Protokolle hochladen und freigeben |
| `mitglied` | Lesezugriff auf freigegebene Protokolle der zugewiesenen Gremien |

## Einrichtung
1. `npm install`
2. `.env.example` nach `.env.local` kopieren und Supabase-Keys eintragen
3. `supabase/migrations/001_schema.sql` im Supabase SQL Editor ausführen (bzw. bereits per MCP eingespielt)
4. Supabase → Authentication → Providers → Email: „Confirm email" an, **Signups deaktivieren** (Benutzer entstehen nur über die Freigabe). Site URL und Redirect URL (`https://<domain>/auth/callback`) eintragen.
5. Ersten Verwaltungs-Benutzer anlegen: Supabase → Authentication → Users → „Invite user", danach das SQL am Ende der Migration ausführen (Rolle `verwaltung`).
6. `npm run dev`

## Ablauf
1. Gemeinderat füllt `/antrag` aus → RPC `stelle_zugangsantrag` (validiert, Missbrauchsbremse) → optional Mail an `VERWALTUNG_EMAIL`
2. Verwaltung prüft unter `/verwaltung/antraege`, wählt Gremien und gibt frei → Benutzer wird angelegt und per Supabase-Einladung eingeladen
3. Mitglied meldet sich mit E-Mail-Code an (`/login`, kein Passwort) und sieht nur die freigegebenen Protokolle seiner Gremien
4. Jeder Aufruf eines Dokuments läuft über `/api/protokoll/[id]` (RLS-Prüfung, Zugriffsprotokoll, signierte URL 120 s)

## Deployment
GitHub-Repo → Vercel (Umgebungsvariablen aus `.env.example`). `push.ps1` committet und pusht.
