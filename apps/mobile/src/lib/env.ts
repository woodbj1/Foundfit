const appUrl = process.env.EXPO_PUBLIC_APP_URL?.trim()
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim()

const missingEnvNames = [
  ['EXPO_PUBLIC_APP_URL', appUrl],
  ['EXPO_PUBLIC_SUPABASE_URL', supabaseUrl],
  ['EXPO_PUBLIC_SUPABASE_ANON_KEY', supabaseAnonKey],
].flatMap(([name, value]) => (value ? [] : [name]))

export const envValidationError = missingEnvNames.length
  ? `Missing ${missingEnvNames.join(', ')}. Add them to the Expo/EAS production environment.`
  : null

export const env = {
  appUrl: appUrl ?? '',
  supabaseUrl: supabaseUrl ?? '',
  supabaseAnonKey: supabaseAnonKey ?? '',
}
