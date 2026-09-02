# Setup-Checkliste – Sitzungsprotokolle Gumpoldskirchen

Erledigt (durch Claude, 02.09.2026):
- Supabase-Projekt `mgm-gumpoldskirchen` (Ref `tqkldsdcffeotxeesnen`) angelegt, Schema eingespielt, Beispieldaten + Verwaltungs-User jv@icp-consultants.at
- `app/.env.local` enthält bereits URL und Publishable Key
- Git-Repo in `app/` initialisiert, erster Commit vorhanden

## 1 · Secret Key eintragen (2 Minuten)
1. https://supabase.com/dashboard/project/tqkldsdcffeotxeesnen/settings/api-keys
2. Abschnitt **Secret keys** → beim Eintrag `default` auf **Reveal**/Kopieren klicken (beginnt mit `sb_secret_…`)
3. In `app/.env.local` in die Zeile `SUPABASE_SERVICE_ROLE_KEY=` einfügen

## 2 · Auth-Einstellungen (3 Minuten)
1. https://supabase.com/dashboard/project/tqkldsdcffeotxeesnen/auth/providers → **Email**:
   - „Enable Email provider" an, „Confirm email" an
   - unter Authentication → **Sign In / Providers** bzw. Settings: **„Allow new users to sign up" AUS** (Benutzer entstehen nur über die Freigabe im Portal)
2. https://supabase.com/dashboard/project/tqkldsdcffeotxeesnen/auth/url-configuration
   - **Site URL**: vorerst `http://localhost:3000`, später `https://<vercel-domain>`
   - **Redirect URLs** hinzufügen: `http://localhost:3000/auth/callback` und später `https://<vercel-domain>/auth/callback`
3. Optional, aber empfohlen: Authentication → **Emails** → Vorlagen „Magic Link" und „Invite user" auf Deutsch anpassen; der Einmal-Code steht in der Vorlage als `{{ .Token }}`.

## 3 · Lokal starten
```powershell
cd "C:\Users\joerg\Claude\Projects\MGM Gumpoldskirchen\app"
npm install
npm run dev
```
→ http://localhost:3000 · Anmelden mit jv@icp-consultants.at (Code kommt per E-Mail).

## 4 · GitHub + Vercel
1. Auf GitHub ein leeres Repo `mgm-gumpoldskirchen` anlegen (privat, ohne README).
2. PowerShell im Ordner `app`:
   ```powershell
   git remote add origin https://github.com/jtvoehringer/mgm-gumpoldskirchen.git
   git push -u origin main
   ```
3. Danach Claude Bescheid geben – das Vercel-Projekt wird per MCP mit dem Repo verknüpft.
4. In Vercel → Project → Settings → **Environment Variables** die Werte aus `.env.local` eintragen
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_APP_URL` = Vercel-Domain, `VERWALTUNG_EMAIL`).
5. Supabase Site URL / Redirect URL (Schritt 2) auf die Vercel-Domain ergänzen.

## 5 · Optional: Benachrichtigungs-Mails
SMTP-Zugangsdaten (z. B. Postfach der Gemeinde in O365: `smtp.office365.com`, Port 587) in `.env.local` bzw. Vercel eintragen – siehe `.env.example`. Ohne SMTP werden keine Mails versendet; Anträge sind trotzdem im Portal sichtbar und die Glocke zählt sie.
