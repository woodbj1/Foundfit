import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Ban,
  CalendarCheck,
  CreditCard,
  FileText,
  HeartPulse,
  Mail,
  Scale,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Footer from '@/components/Footer'
import { SITE } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Terms that govern use of FoundFit services, bookings, and digital offerings.',
}

const sections = [
  {
    icon: FileText,
    title: '1. Acceptance of Terms',
    content: `By accessing or using ${SITE.name}, including our website, booking tools, training services, meal plans, and digital content, you agree to be bound by these Terms of Service. If you do not agree, do not use the services.`,
  },
  {
    icon: CalendarCheck,
    title: '2. Services and Bookings',
    content:
      'Services may include personal training, virtual coaching, meal plans, and digital content. Availability, trainer assignment, session format, and scheduling are subject to change. A booking is not guaranteed until it is confirmed through the platform or by our team.',
  },
  {
    icon: CreditCard,
    title: '3. Payments, Subscriptions, and Refunds',
    content:
      'Paid services must be purchased through the approved checkout flow. Subscription, session-pack, and one-time purchase terms are shown at checkout and may vary by service. Unless otherwise required by law or expressly stated in writing, fees are non-refundable once a session, subscription period, meal plan, or digital-access benefit has been delivered or made available.',
  },
  {
    icon: Ban,
    title: '4. Cancellations and Account Misuse',
    content:
      'We may limit, reschedule, or cancel services when necessary for safety, trainer availability, suspected fraud, abusive conduct, chargebacks, policy violations, or misuse of the platform. Users may not share accounts, attempt unauthorized access, scrape data, reverse engineer protected features, or use the platform for unlawful purposes.',
  },
  {
    icon: HeartPulse,
    title: '5. Health and Fitness Disclaimer',
    content:
      'Fitness services involve physical activity and carry inherent risk. You are responsible for ensuring that you are medically able to participate. Our content, coaching, and meal plans are for general wellness and educational purposes only and are not medical advice, diagnosis, or treatment. You should consult a qualified healthcare professional before starting or changing exercise or nutrition activity.',
  },
  {
    icon: ShieldAlert,
    title: '6. Virtual Sessions and Digital Content',
    content:
      'Virtual sessions and digital products depend on third-party platforms and internet availability. We are not responsible for service interruptions caused by internet outages, browser/device issues, third-party video providers, or external platform failures. Digital access is licensed for personal use only and may not be copied, redistributed, or resold.',
  },
  {
    icon: Scale,
    title: '7. Limitation of Liability',
    content: `${SITE.name} is not liable for indirect, incidental, special, consequential, or punitive damages, or for loss of data, revenue, profits, or business opportunity arising from use of the platform or services. To the maximum extent allowed by law, our total liability for any claim relating to the services will not exceed the amount you paid to us for the specific service giving rise to the claim during the 3 months before the event.`,
  },
  {
    icon: Mail,
    title: '8. Contact Information',
    content: `Questions about these Terms of Service can be sent to ${SITE.email}. Our mailing address is ${SITE.fullAddress}.`,
  },
] as const

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link
            href="/"
            className="text-2xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent"
          >
            {SITE.name}
          </Link>
          <Link href="/">
            <Button variant="ghost">Back to Home</Button>
          </Link>
        </div>
      </header>

      <main className="flex-grow max-w-5xl mx-auto px-4 py-12 w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Terms of Service</h1>
          <p className="text-xl text-gray-600">Last Updated: April 7, 2026</p>
          <p className="mt-4 text-gray-500 max-w-2xl mx-auto">
            These terms explain the rules that apply when you use {SITE.name}, purchase services,
            book training sessions, or access digital content through the platform.
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
