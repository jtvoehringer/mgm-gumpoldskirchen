# E-Mail-Vorlagen für Supabase Auth

Einfügen unter Supabase → Authentication → Emails (Templates):

| Vorlage | Datei | Betreff |
|---|---|---|
| Magic Link | `magic-link.html` | Ihr Anmelde-Code für die Sitzungsprotokolle Gumpoldskirchen |
| Invite user | `einladung.html` | Ihr Zugang zu den Sitzungsprotokollen wurde freigegeben |

Platzhalter: `{{ .Token }}` = Einmal-Code, `{{ .ConfirmationURL }}` = Anmelde-/Einladungslink, `{{ .Email }}` = Adresse.

Wichtig: Der eingebaute Supabase-Mailversand ist auf wenige Mails pro Stunde begrenzt („email rate limit exceeded").
Für den Betrieb unter Authentication → SMTP Settings einen eigenen SMTP-Versand eintragen (z. B. Office 365: smtp.office365.com, Port 587).
