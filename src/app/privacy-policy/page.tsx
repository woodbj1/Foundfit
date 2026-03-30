import type { Metadata } from 'next'
import Link from 'next/link'
import { Shield, Lock, Eye, Server, Cookie, Mail, FileText, Database } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Our commitment to protecting your privacy and personal data.',
}

const sections = [
  {
    icon: Shield,
    title: '1. Introduction',
    content: `Foundation Fitness ("we," "our," or "us") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services. Please read this policy carefully. If you disagree with its terms, please discontinue use of our site.`,
  },
  {
    icon: Database,
    title: '2. Information We Collect',
    content: `We collect information you provide directly to us, including: name, email address, phone number, billing information, and fitness goals. We also automatically collect certain information when you visit our website, such as IP address, browser type, pages visited, and time spent on those pages.`,
  },
  {
    icon: Eye,
    title: '3. How We Use Your Information',
    content: `We use the information we collect to: provide, operate, and improve our services; process transactions and send related information; send promotional communications (with your consent); respond to comments and questions; and monitor and analyze trends and usage.`,
  },
  {
    icon: Lock,
    title: '4. Sharing Your Information',
    content: `We do not sell, trade, or otherwise transfer your personally identifiable information to outside parties except to trusted third parties who assist us in operating our website, conducting our business, or servicing you—provided those parties agree to keep this information confidential. We may also release your information to comply with legal obligations.`,
  },
  {
    icon: Server,
    title: '5. Data Security',
    content: `We implement appropriate technical and organizational security measures to protect your personal information against accidental or unlawful destruction, loss, alteration, unauthorized disclosure, or access. However, no method of transmission over the Internet or electronic storage is 100% secure.`,
  },
  {
    icon: Cookie,
    title: '6. Cookies',
    content: `We use cookies and similar tracking technologies to track activity on our service and hold certain information. Cookies are files with a small amount of data. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.`,
  },
  {
    icon: FileText,
    title: '7. Your Rights',
    content: `You have the right to access, update, or delete the information we hold about you. You may also have the right to object to or restrict certain types of processing of your personal data. To exercise these rights, please contact us at contact@foundationfitness.com.`,
  },
  {
    icon: Mail,
    title: '8. Contact Us',
    content: `If you have any questions about this Privacy Policy, please contact us at: Foundation Fitness, 6184 Mortimer CT NW, Acworth GA 30101. Email: contact@foundationfitness.com`,
  },
]

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent"
          >
            Foundation Fitness
          </Link>
          <Link href="/">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto px-4 py-12 w-full">

        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-600">Last Updated: January 15, 2026</p>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            At Foundation Fitness, we value your privacy and are committed to protecting your personal data.
            This policy outlines how we collect, use, and safeguard your information.
          </p>
        </div>

        <div className="space-y-6">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <section.icon className="h-6 w-6 text-purple-600 flex-shrink-0" />
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 leading-relaxed">{section.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/">
            <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white px-8">
              Back to Home
            </Button>
          </Link>
        </div>

      </main>

      <Footer />
    </div>
  )
}
