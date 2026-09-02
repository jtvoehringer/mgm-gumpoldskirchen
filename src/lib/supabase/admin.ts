import { createClient } from '@supabase/supabase-js'

/**
 * Supabase Admin Client mit Service-Role-Key.
 * NUR in Server Actions / Route Handlers verwenden – niemals im Browser!
 * Wird für das Anlegen/Einladen von Benutzern nach der Freigabe benötigt.
 */
export function createSupabaseAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}
