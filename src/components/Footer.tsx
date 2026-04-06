import Link from 'next/link'
import { Dumbbell, Mail, MapPin, Phone } from 'lucide-react'
import { SITE } from '@/lib/site-config'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 text-white">
              <Dumbbell className="h-8 w-8 text-purple-500" />
              <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                {SITE.name}
              </span>
            </Link>
            <p className="text-sm text-gray-400">
              Personalized training, virtual coaching, and nutrition support built around your real life.
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-purple-400 transition-colors">Home</Link></li>
              <li><Link href="/location" className="hover:text-purple-400 transition-colors">Location</Link></li>
              <li><Link href="/#pricing" className="hover:text-purple-400 transition-colors">Plans &amp; Pricing</Link></li>
              <li><Link href="/login" className="hover:text-purple-400 transition-colors">Login</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy-policy" className="hover:text-purple-400 transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span>{SITE.addressLine1}<br />{SITE.addressLine2}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-500 flex-shrink-0" />
                <a href={`mailto:${SITE.email}`} className="hover:text-purple-400 transition-colors">
                  {SITE.email}
                </a>
              </li>
              {SITE.phone ? (
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-purple-500 flex-shrink-0" />
                  <span>{SITE.phone}</span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} {SITE.name}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
