import type { NextConfig } from 'next'

function getSupabaseHostname() {
  const value = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!value) {
    return null
  }

  try {
    return new URL(value).hostname
  } catch {
    return null
  }
}

const supabaseHostname = getSupabaseHostname()

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'horizons-cdn.hostinger.com',
      },
      ...(supabaseHostname
        ? [
            {
              protocol: 'https' as const,
              hostname: supabaseHostname,
            },
          ]
        : []),
    ],
  },
}

export default nextConfig
