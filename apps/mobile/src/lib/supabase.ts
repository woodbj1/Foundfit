import 'react-native-url-polyfill/auto'

import { createClient } from '@supabase/supabase-js'

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

export const supabase = envValidationError
  ? null
  : createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: memoryStorageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
