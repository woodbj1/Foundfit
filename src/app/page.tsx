import Image from 'next/image'
import Link from 'next/link'
import {
  Calendar,
  Check,
  Clock,
  CreditCard,
  Trophy,
  MapPin,
  Heart,
  Users,
  User,
} from 'lucide-react'
import BrandLogo from '@/components/brand/brand-logo'
import HeroCarousel, { type HeroCarouselSlide } from '@/components/marketing/hero-carousel'
import { Button } from '@/components/ui/button'
import Footer from '@/components/Footer'
import { getPublicServiceCatalog, type PublicService } from '@/lib/public-catalog'
import { SITE, formatPrice } from '@/lib/site-config'

const features = [
  {
    icon: Calendar,
    title: 'Easy Booking',
    description: 'Schedule your sessions with our simple booking system',
  },
  {
    icon: Clock,
    title: 'Flexible Timing',
    description: 'Choose from available time slots that fit your schedule',
  },
  {
    icon: CreditCard,
    title: 'Flexible Payment',
    description: 'Choose single sessions, packs, memberships, or add-on support',
  },
  {
    icon: Trophy,
    title: 'Expert Training',
    description: 'Get personalized training from certified professionals',
  },
]

const heroSlides: HeroCarouselSlide[] = [
  {
    src: 'https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/woodbury_035-pAt2U.jpg',
    alt: 'Personal trainer working with client in modern gym',
    eyebrow: 'Personal Coaching',
    caption: 'Focused one-on-one sessions built around your goals, schedule, and confidence.',
  },
  {
    src: 'https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/ceac7d79e2c2f23386ba9b92ab3824c7.jpg',
    alt: 'Fully equipped private training studio with squat rack and mirrors',
    eyebrow: 'Private Studio',
    caption: 'Train in a distraction-free space with professional equipment and room to move.',
  },
  {
    src: 'https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/28dc45b081d27f65ff7896ff9787ffbc.jpg',
    alt: 'Open workout floor with dumbbells and strength equipment',
    eyebrow: 'Strength First',
    caption: 'Build sustainable strength with progressive programming, not generic workouts.',
  },
]

function getServiceBadge(service: PublicService) {
  if (service.is_popular) {
    return 'Popular'
  }

  if (service.fulfillment_type === 'daily') {
    return 'Live Virtual'
  }

  if (service.fulfillment_type === 'vimeo') {
    return 'On Demand'
  }

  if (service.type === 'meal_plan') {
    return 'Nutrition'
  }

  if (service.type === 'pack' && service.session_count) {
    return `${service.session_count}-Pack`
  }

  return null
}

function getPriceSuffix(service: PublicService) {
  if (service.type === 'unlimited' || service.type === 'meal_plan') {
    return '/ month'
  }

  if (service.type === 'single' && service.is_session) {
    return '/ session'
  }

  return 'one-time'
}

function getCtaLabel(service: PublicService) {
  if (service.fulfillment_type === 'vimeo') {
    return 'Unlock Access'
  }

  if (service.type === 'meal_plan') {
    return 'Get Nutrition Plan'
  }

  if (service.type === 'unlimited') {
    return 'Start Membership'
  }

  if (service.type === 'pack') {
    return 'Choose Pack'
  }

  return 'Book Session'
}

function getHighlights(service: PublicService) {
  const highlights: string[] = []

  if (service.fulfillment_type === 'daily') {
    highlights.push('Live coach-led session from anywhere')
  } else if (service.fulfillment_type === 'vimeo') {
    highlights.push('Instant access to your on-demand workout library')
  } else if (service.type === 'meal_plan') {
    highlights.push('Customized nutrition guidance tailored to your goals')
  } else if (service.duration_minutes > 0) {
    highlights.push(`${service.duration_minutes}-minute coaching sessions`)
  }

  if (service.type === 'unlimited' && service.max_weekly_bookings > 0) {
    highlights.push(`Book up to ${service.max_weekly_bookings} sessions each week`)
  } else if (service.type === 'pack' && service.session_count) {
    highlights.push(`${service.session_count} sessions to use at your own pace`)
  } else if (service.type === 'single') {
    highlights.push('Flexible scheduling with no long-term commitment')
  } else if (service.type === 'meal_plan') {
    highlights.push('Updated monthly with practical grocery guidance')
  }

  if (service.fulfillment_type === 'vimeo') {
    highlights.push('Perfect for workouts, mobility, and recovery days')
  } else if (service.fulfillment_type === 'daily') {
    highlights.push('Secure video delivery with built-in join links')
  } else if (service.type === 'meal_plan') {
    highlights.push('Trainer-created plan delivered through your client portal')
  } else {
    highlights.push('Built around your goals, schedule, and training level')
  }

  return highlights.slice(0, 3)
}

export default async function HomePage() {
  const services = await getPublicServiceCatalog()

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 flex flex-col">
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <BrandLogo imageClassName="h-20 w-auto max-w-[120px]" priority />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/location">
                <Button variant="ghost" className="text-gray-600 hover:text-purple-600 hover:bg-purple-50">
                  <MapPin className="w-4 h-4 mr-2" />
                  Location
                </Button>
              </Link>
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
        <section className="relative overflow-hidden py-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              Transform Your Fitness Journey
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
              Experience personalized training that adapts to your goals, schedule, and lifestyle.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 hover:opacity-90 text-white text-lg px-8"
                >
                  Book Your First Session
                </Button>
              </Link>
              <Link href="#pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 text-lg px-8"
                >
                  View Pricing
                </Button>
              </Link>
            </div>
          </div>

          <div className="max-w-5xl mx-auto mt-16">
            <HeroCarousel slides={heroSlides} />
          </div>
        </section>

        <section className="py-20 px-4 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              Why Train with {SITE.name}?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-pink-500 via-purple-500 to-cyan-500 rounded-lg flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2 text-gray-800">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
                <div className="absolute -bottom-4 -right-4 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white rotate-2 hover:rotate-0 transition-transform duration-500">
                  <Image
                    alt="Experienced female personal trainer smiling confidently in a gym environment"
                    className="w-full h-full object-cover"
                    src="https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/woodbury_150-tHUPT.jpg"
                    width={1200}
                    height={1500}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-current" /> Woman-Focused
                  </span>
                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Users className="w-3 h-3" /> Community
                  </span>
                </div>
                <h2 className="text-4xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                  Empowering Women Through Fitness
                </h2>

                <div className="space-y-6 text-lg text-gray-700">
                  <p>
                    {SITE.name} is more than just a training studio - it&apos;s a supportive community dedicated to
                    women&apos;s health and empowerment. We understand that every woman&apos;s body and journey is
                    unique, which is why we&apos;ve built a space where you can feel confident, supported, and strong.
                  </p>

                  <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-purple-100 shadow-sm">
                    <h3 className="text-xl font-bold text-purple-700 mb-3 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Meet Your Trainer
                    </h3>
                    <p className="mb-4 text-gray-600">
                      &ldquo;Hi, I&apos;m {SITE.trainerName}! With over 10 years of experience in women&apos;s specialized
                      training, I focus on building strength, confidence, and sustainable lifestyle changes. My
                      approach combines evidence-based training methods with nutritional guidance to help you feel your
                      best inside and out - no crash diets, just real results.&rdquo;
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium border border-gray-200">Certified PT</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium border border-gray-200">Nutrition Coach</span>
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium border border-gray-200">Pre/Post Natal</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white rounded-lg shadow-sm border border-pink-100 hover:border-pink-300 transition-colors">
                      <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center mb-2">
                        <User className="w-4 h-4 text-pink-600" />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1">One-on-One</h4>
                      <p className="text-sm text-gray-600">Personalized attention tailored to your specific goals and needs.</p>
                    </div>
                    <div className="p-4 bg-white rounded-lg shadow-sm border border-purple-100 hover:border-purple-300 transition-colors">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mb-2">
                        <Users className="w-4 h-4 text-purple-600" />
                      </div>
                      <h4 className="font-bold text-gray-900 mb-1">Small Group Energy</h4>
                      <p className="text-sm text-gray-600">Accountability, encouragement, and coaching that still feels personal.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
                Plans That Match Your Goals
              </h2>
              <p className="text-lg text-gray-600 max-w-3xl mx-auto">
                Choose from in-person training, live virtual coaching, on-demand access, and nutrition support.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map((service) => {
                const badge = getServiceBadge(service)
                const highlights = getHighlights(service)
                const isFeatured = service.is_popular

                return (
                  <div
                    key={service.title}
                    className={
                      isFeatured
                        ? 'bg-gradient-to-br from-purple-600 to-cyan-600 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow text-white relative overflow-hidden'
                        : 'bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow relative'
                    }
                  >
                    {badge ? (
                      <div
                        className={
                          isFeatured
                            ? 'absolute top-4 right-4 bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-semibold'
                            : 'absolute top-4 right-4 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold'
                        }
                      >
                        {badge}
                      </div>
                    ) : null}

                    <div className="mb-6 pr-20">
                      <h3 className={`text-2xl font-bold mb-3 ${isFeatured ? 'text-white' : 'text-gray-800'}`}>
                        {service.title}
                      </h3>
                      <p className={isFeatured ? 'text-purple-50' : 'text-gray-600'}>
                        {service.description}
                      </p>
                    </div>

                    <div className="mb-6">
                      <span
                        className={
                          isFeatured
                            ? 'text-5xl font-bold text-white'
                            : 'text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent'
                        }
                      >
                        {formatPrice(service.price)}
                      </span>
                      <span className={isFeatured ? 'ml-2 text-purple-50' : 'text-gray-600 ml-2'}>
                        {getPriceSuffix(service)}
                      </span>
                    </div>

                    <ul className="space-y-3 mb-8">
                      {highlights.map((item) => (
                        <li
                          key={item}
                          className={`flex items-start gap-2 ${isFeatured ? 'text-white' : 'text-gray-700'}`}
                        >
                          <div
                            className={
                              isFeatured
                                ? 'mt-0.5 rounded-full bg-white/20 p-1'
                                : 'mt-0.5 rounded-full bg-pink-100 p-1'
                            }
                          >
                            <Check className={`h-3.5 w-3.5 ${isFeatured ? 'text-white' : 'text-pink-600'}`} />
                          </div>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    <Link href="/signup">
                      <Button
                        className={
                          isFeatured
                            ? 'w-full bg-white text-purple-600 hover:bg-gray-100'
                            : 'w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white'
                        }
                      >
                        {getCtaLabel(service)}
                      </Button>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="py-20 px-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl font-bold mb-6">Ready to Start Your Journey?</h2>
            <p className="text-xl mb-8">
              Join {SITE.name} today and build a training plan that actually fits your life.
            </p>
            <Link href="/signup">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100 text-lg px-8">
                Sign Up Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
