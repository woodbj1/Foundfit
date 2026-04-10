import 'react-native-url-polyfill/auto'

import * as SecureStore from 'expo-secure-store'
import { createClient } from '@supabase/supabase-js'

import { env, envValidationError } from '@/lib/env'

const memoryStorage = new Map<string, string>()

const ExpoSecureStoreAdapter = {
  async getItem(key: string) {
    try {
      const value = await SecureStore.getItemAsync(key)

      if (value != null) {
        memoryStorage.set(key, value)
      }

      return value ?? memoryStorage.get(key) ?? null
    } catch {
      return memoryStorage.get(key) ?? null
    }
  },
  async setItem(key: string, value: string) {
    memoryStorage.set(key, value)

    try {
      await SecureStore.setItemAsync(key, value)
    } catch {
      // Fall back to memory storage so auth bootstrap doesn't crash on launch.
    }
  },
  async removeItem(key: string) {
    memoryStorage.delete(key)

    try {
      await SecureStore.deleteItemAsync(key)
    } catch {
      // Ignore SecureStore cleanup failures during sign-out.
    }
  },
}

export const supabase = envValidationError
  ? null
  : createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        storage: ExpoSecureStoreAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
