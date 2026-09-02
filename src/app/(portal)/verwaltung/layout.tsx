import { redirect } from 'next/navigation'
import { getProfil, canUpload } from '@/lib/auth/roles'

/** Verwaltungsbereich: nur Gemeindeverwaltung und Schriftführung; Feinprüfung je Seite */
export default async function VerwaltungLayout({ children }: { children: React.ReactNode }) {
  const profil = await getProfil()
  if (!profil || !canUpload(profil.rolle)) redirect('/portal')
  return <>{children}</>
}
