import type { Metadata } from 'next'
import '@fontsource/libre-franklin/400.css'
import '@fontsource/libre-franklin/500.css'
import '@fontsource/libre-franklin/600.css'
import '@fontsource/barlow-condensed/500.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'Sitzungsunterlagen · Marktgemeinde Gumpoldskirchen', template: '%s · Sitzungsunterlagen Gumpoldskirchen' },
  description: 'Digitale Bereitstellung der Sitzungsunterlagen von Gemeinderat und Gemeindevorstand der Marktgemeinde Gumpoldskirchen.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de-AT">
      <body>{children}</body>
    </html>
  )
}
