import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Foundation Fitness | Personal Training in Acworth, GA',
    template: '%s | Foundation Fitness',
  },
  description:
    'Transform your fitness journey with Foundation Fitness. Personalized training for women, flexible scheduling, and expert coaching in Acworth, GA.',
  keywords: ['personal training', 'fitness', 'Acworth GA', 'women fitness', 'meal plans', 'workout', 'trainer', 'Foundation Fitness'],
  authors: [{ name: 'Foundation Fitness' }],
  openGraph: {
    title: 'Foundation Fitness | Personal Training in Acworth, GA',
    description:
      'Transform your fitness journey with personalized training, flexible scheduling, and expert coaching.',
    url: 'https://foundationfitness.com',
    siteName: 'Foundation Fitness',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Foundation Fitness | Personal Training',
    description: 'Expert personal training & custom meal plans in Acworth, GA.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased`}>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  )
}
