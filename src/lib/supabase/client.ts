import { createBrowserClient } from '@supabase/ssr'

/** Supabase Browser Client – nur in Client Components ('use client') */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
