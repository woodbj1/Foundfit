import Link from 'next/link'
import { Dumbbell, Globe, Mail, MapPin, Phone } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand Column */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 text-white">
              <Dumbbell className="h-8 w-8 text-purple-500" />
              <span className="text-xl font-bold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
                Foundation Fitness
              </span>
            </Link>
            <p className="text-sm text-gray-400">
              Transforming lives through personalized fitness training and holistic wellness coaching.
            </p>
            <div className="flex space-x-4 pt-2">
              <a href="#" className="hover:text-pink-500 transition-colors text-sm font-medium">Instagram</a>
              <a href="#" className="hover:text-blue-400 transition-colors text-sm font-medium">Twitter</a>
              <a href="#" className="hover:text-blue-600 transition-colors text-sm font-medium">Facebook</a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-purple-400 transition-colors">Home</Link></li>
              <li><Link href="/location" className="hover:text-purple-400 transition-colors">Location</Link></li>
              <li><Link href="/book" className="hover:text-purple-400 transition-colors">Book a Session</Link></li>
              <li><Link href="/login" className="hover:text-purple-400 transition-colors">Trainer Login</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/privacy-policy" className="hover:text-purple-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="#" className="hover:text-purple-400 transition-colors">Terms of Service</Link></li>
              <li><Link href="#" className="hover:text-purple-400 transition-colors">Cookie Policy</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-lg">Contact Us</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <span>6184 Mortimer CT NW,<br />Acworth GA 30101</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-purple-500 flex-shrink-0" />
                <a href="mailto:contact@foundationfitness.com" className="hover:text-purple-400 transition-colors">
                  contact@foundationfitness.com
                </a>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-purple-500 flex-shrink-0" />
                <span>(555) 123-4567</span>
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Foundation Fitness. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
