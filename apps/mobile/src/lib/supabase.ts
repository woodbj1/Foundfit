import type { Session, SupabaseClient } from '@supabase/supabase-js'

import { env, envValidationError } from '@/lib/env'

const memoryStorage = new Map<string, string>()

const memoryStorageAdapter = {
  async getItem(key: string) {
    return memoryStorage.get(key) ?? null
  },
  async setItem(key: string, value: string) {
    memoryStorage.set(key, value)
  },
  async removeItem(key: string) {
    memoryStorage.delete(key)
  },
}

let supabaseClientPromise: Promise<SupabaseClient | null> | null = null

export type MobileSession = Session

export async function getSupabaseClient() {
  if (envValidationError) {
    return null
  }

  if (env.supabaseUrl === '' || env.supabaseAnonKey === '') {
    return null
  }

  if (!supabaseClientPromise) {
    supabaseClientPromise = (async () => {
      try {
        const { createClient } = await import('@supabase/supabase-js')

        return createClient(env.supabaseUrl, env.supabaseAnonKey, {
          auth: {
            storage: memoryStorageAdapter,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
          },
        })
      } catch (error) {
        console.error('Failed to create Supabase client:', error)
        supabaseClientPromise = null
        throw new Error(
          `Supabase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      }
    })()
  }

  return supabaseClientPromise
}
