import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'horizons-cdn.hostinger.com',
      },
    ],
  },
}

export default nextConfig
