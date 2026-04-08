import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Dumbbell, MapPin, Car, Check, ArrowRight, Home } from 'lucide-react'
import BrandLogo from '@/components/brand/brand-logo'
import { Button } from '@/components/ui/button'
import Footer from '@/components/Footer'
import { SITE, formatPrice } from '@/lib/site-config'

export const metadata: Metadata = {
  title: 'Our Location',
  description: `Visit the ${SITE.name} private training facility in ${SITE.location}.`,
}

const amenities = [
  'Professional Squat Rack & Cable System',
  'Complete Set of Dumbbells & Free Weights',
  'TRX Suspension Trainers',
  'Resistance Bands & Stability Balls',
  'Yoga & Stretching Area',
  'Full-Length Mirrors for Form Check',
  'Air Conditioned & Ventilated',
  'Private Changing Area',
]

const images = [
  {
    src: 'https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/ceac7d79e2c2f23386ba9b92ab3824c7.jpg',
    alt: 'Fully equipped gym with squat rack, mirrors, and free weights',
    title: 'Main Training Area',
  },
  {
    src: 'https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/bfce384135e32f83654f86e98293bb0d.jpg',
    alt: 'Advanced cable machine and strength training equipment',
    title: 'Strength Station',
  },
  {
    src: 'https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/28dc45b081d27f65ff7896ff9787ffbc.jpg',
    alt: 'Spacious workout floor with dumbbell rack and mirrors',
    title: 'Free Weight Zone',
  },
  {
    src: 'https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/08345c4b6ff39bec136d7ae84747bbf7.jpg',
    alt: 'Private studio space with wood flooring and natural light',
    title: 'Studio Space',
  },
]

export default function LocationPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 flex flex-col">
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo imageClassName="h-20 w-auto max-w-[120px]" priority />
            </Link>
            <div className="flex gap-3">
              <Link href="/login">
                <Button variant="ghost" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50">
                  Login
                </Button>
              </Link>
              <Link href="/signup">
                <Button className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-grow">
        <section className="py-16 px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">
              Our Training Facility
            </h1>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              A private, distraction-free environment designed to help you focus on your goals.
            </p>
          </div>
        </section>

        <section className="px-4 pb-20">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-6">
              {images.map((img) => (
                <div
                  key={img.title}
                  className="relative group overflow-hidden rounded-2xl shadow-lg aspect-[4/3]"
                >
                  <Image
                    src={img.src}
                    alt={img.alt}
                    width={1200}
                    height={900}
                    className="object-cover w-full h-full transform transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-6">
                    <span className="text-white text-lg font-semibold">{img.title}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-white/50 backdrop-blur-sm px-4">
          <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16">
            <div>
              <div className="mb-12 p-6 bg-white rounded-2xl shadow-xl border border-purple-100">
                <h2 className="text-3xl font-bold mb-4 flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-pink-100 rounded-lg">
                    <MapPin className="w-6 h-6 text-pink-600" />
                  </div>
                  Our Studio Address
                </h2>
                <p className="text-xl text-gray-700 font-semibold mb-2">{SITE.addressLine1}</p>
                <p className="text-xl text-gray-700 font-semibold">{SITE.addressLine2}</p>
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(SITE.fullAddress)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mt-4 text-purple-600 hover:text-purple-700 font-medium transition-colors"
                >
                  Get Directions <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3 text-gray-900">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Dumbbell className="w-6 h-6 text-purple-600" />
                  </div>
                  Premium Equipment &amp; Amenities
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {amenities.map((item) => (
                    <div key={item} className="flex items-center gap-3 p-3 bg-white rounded-lg shadow-sm border border-purple-100">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-green-600" />
                      </div>
                      <span className="text-gray-700 font-medium">{item}</span>
                    </div>
                  ))}
                </div>
                <p className="mt-6 text-gray-600 leading-relaxed">
                  Our facility is designed to cater to all fitness levels, from beginners to advanced athletes.
                  Unlike crowded commercial gyms, our private studio ensures you never have to wait for equipment
                  and can train in privacy and comfort.
                </p>
              </div>
            </div>

            <div className="space-y-8">
              <div className="bg-white rounded-2xl p-8 shadow-lg border-l-4 border-purple-500">
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 text-gray-900">
                  <Home className="w-6 h-6 text-purple-600" />
                  In-Studio Sessions
                </h3>
                <p className="text-gray-600 mb-4">
                  We strongly recommend training at our facility to take full advantage of our specialized equipment
                  and controlled environment. This ensures the highest quality training experience.
                </p>
                <div className="flex items-center gap-2 text-sm text-purple-700 font-semibold bg-purple-50 p-3 rounded-lg w-fit">
                  <Check className="w-4 h-4" />
                  No extra fees applied
                </div>
              </div>

              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 shadow-lg text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Car className="w-32 h-32" />
                </div>
                <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                  <Car className="w-6 h-6 text-purple-400" />
                  We Come to You
                </h3>
                <p className="text-gray-300 mb-6 relative z-10">
                  Can&apos;t make it to the studio? We offer mobile training services where we bring the workout to
                  your home or preferred location.
                </p>
                <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/20 mb-6">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-purple-200">Travel Fee</span>
                    <span className="text-2xl font-bold text-white">{formatPrice(SITE.travelFeeCents)}</span>
                  </div>
                  <p className="text-xs text-gray-400">
                    Added to your session price to cover travel time and fuel costs.
                  </p>
                </div>
                <Link href="/signup">
                  <Button className="w-full bg-white text-gray-900 hover:bg-gray-100 font-semibold">
                    Book Mobile Session <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-gray-900">Ready to See It in Person?</h2>
            <p className="text-lg text-gray-600 mb-8">
              Book your first session today and experience the difference of training in a private, professional studio.
            </p>
            <div className="flex justify-center gap-4 flex-wrap">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white px-8"
                >
                  Book Now
                </Button>
              </Link>
              <Link href="/">
                <Button size="lg" variant="outline" className="border-purple-200 text-purple-700 hover:bg-purple-50 px-8">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
