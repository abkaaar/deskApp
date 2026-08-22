import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { electronAuthStorage } from '@/lib/supabase/electron-storage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null = null

function requireSupabaseEnv(): { url: string; anonKey: string } {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and add your Supabase credentials.',
    )
  }
  return { url: supabaseUrl, anonKey: supabaseAnonKey }
}

export function getSupabaseAnonKey(): string {
  return requireSupabaseEnv().anonKey
}

/** Session-less client for public pre-login calls (never sends a user JWT). */
export function createPublicSupabaseClient(): SupabaseClient {
  const { url, anonKey } = requireSupabaseEnv()
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

export function getSupabaseClient(): SupabaseClient {
  if (client) return client

  const { url, anonKey } = requireSupabaseEnv()

  client = createClient(url, anonKey, {
    auth: {
      storage: electronAuthStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  })

  return client
}

export function resetSupabaseClient(): void {
  client = null
}
