const appUrl = process.env.EXPO_PUBLIC_APP_URL?.trim()
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()

function requiredEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`Missing ${name}. Add it to apps/mobile/.env or your EAS/Expo environment.`)
  }

  return value
}

export const env = {
  appUrl: requiredEnv('EXPO_PUBLIC_APP_URL', appUrl),
  supabaseUrl: requiredEnv('EXPO_PUBLIC_SUPABASE_URL', supabaseUrl),
  supabaseAnonKey: requiredEnv('EXPO_PUBLIC_SUPABASE_ANON_KEY', supabaseAnonKey),
}
