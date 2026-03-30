import Link from 'next/link'
import {
  Dumbbell,
  Calendar,
  Clock,
  CreditCard,
  Trophy,
  MapPin,
  Heart,
  Users,
  User,
  Utensils,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Footer from '@/components/Footer'

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
    description: 'Pay per session or subscribe for unlimited training',
  },
  {
    icon: Trophy,
    title: 'Expert Training',
    description: 'Get personalized training from certified professionals',
  },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-cyan-50 flex flex-col">

      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <Dumbbell className="h-8 w-8 text-purple-600" />
              <span className="text-2xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent">
                Foundation Fitness
              </span>
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

        {/* Hero Section */}
        <section className="relative overflow-hidden py-20 px-4">
          <div className="max-w-7xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              Transform Your Fitness Journey
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto">
              Experience personalized training that adapts to your goals, schedule, and lifestyle
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
              <Button
                size="lg"
                variant="outline"
                className="border-2 border-purple-500 text-purple-600 hover:bg-purple-50 text-lg px-8"
              >
                View Pricing
              </Button>
            </div>
          </div>

          {/* Hero Image */}
          <div className="max-w-5xl mx-auto mt-16">
            <img
              className="rounded-2xl shadow-2xl w-full"
              alt="Personal trainer working with client in modern gym"
              src="https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/woodbury_035-pAt2U.jpg"
            />
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              Why Choose Foundation Fitness?
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <div
                  key={index}
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

        {/* Trainer Profile / About Section */}
        <section className="py-20 px-4 bg-gradient-to-br from-purple-50 to-pink-50 overflow-hidden">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">

              {/* Image Column */}
              <div className="relative">
                <div className="absolute -top-4 -left-4 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
                <div className="absolute -bottom-4 -right-4 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse" />
                <div className="relative rounded-2xl overflow-hidden shadow-2xl border-4 border-white rotate-2 hover:rotate-0 transition-transform duration-500">
                  <img
                    alt="Experienced female personal trainer smiling confidently in a gym environment"
                    className="w-full h-full object-cover"
                    src="https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/woodbury_150-tHUPT.jpg"
                  />
                </div>
              </div>

              {/* Content Column */}
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
                    Foundation Fitness is more than just a gym—it&apos;s a supportive community dedicated to
                    women&apos;s health and empowerment. We understand that every woman&apos;s body and journey is
                    unique, which is why we&apos;ve built a space where you can feel confident, supported, and strong.
                  </p>

                  <div className="bg-white/60 backdrop-blur-sm p-6 rounded-xl border border-purple-100 shadow-sm">
                    <h3 className="text-xl font-bold text-purple-700 mb-3 flex items-center gap-2">
                      <User className="w-5 h-5" />
                      Meet Your Trainer
                    </h3>
                    <p className="mb-4 text-gray-600">
                      &ldquo;Hi, I&apos;m Caroline! With over 10 years of experience in women&apos;s specialized training,
                      I focus on building strength, confidence, and sustainable lifestyle changes. My approach combines
                      evidence-based training methods with nutritional guidance to help you feel your best inside and
                      out—no crash diets, just real results.&rdquo;
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
                      <h4 className="font-bold text-gray-900 mb-1">Group Sessions</h4>
                      <p className="text-sm text-gray-600">Energetic small group training to keep you motivated and connected.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="py-20 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-600 bg-clip-text text-transparent">
              Flexible Pricing Options
            </h2>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">

              {/* Pay As You Go */}
              <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow">
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Pay As You Go</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">$40</span>
                  <span className="text-gray-600 ml-2">/ session</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['1-hour personal training session', 'Flexible scheduling', 'No commitment required'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white">
                    Book Session
                  </Button>
                </Link>
              </div>

              {/* Buddy Session */}
              <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow relative">
                <div className="absolute top-4 right-4 bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Users className="w-3 h-3" /> 2 People
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Buddy Session</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">$25</span>
                  <span className="text-gray-600 ml-2">/ person</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Train with a friend', 'Shared motivation', 'Cost effective'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white">
                    Book Buddy Session
                  </Button>
                </Link>
              </div>

              {/* 6-Week Plan */}
              <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Zap className="w-3 h-3" /> New
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">6-Week Plan</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">$125</span>
                  <span className="text-gray-600 ml-2">one-time</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Structured program', 'Weekly check-ins', 'Progressive overload'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white">
                    Get Started
                  </Button>
                </Link>
              </div>

              {/* Unlimited Monthly — Featured */}
              <div className="bg-gradient-to-br from-purple-600 to-cyan-600 rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow text-white relative overflow-hidden">
                <div className="absolute top-4 right-4 bg-pink-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  Popular
                </div>
                <h3 className="text-2xl font-bold mb-4">Unlimited Monthly</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold">$200</span>
                  <span className="ml-2">/ month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Unlimited training sessions', 'Priority booking', 'Personalized workout plans'].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-600 text-xs">✓</span>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="w-full bg-white text-purple-600 hover:bg-gray-100">
                    Start Subscription
                  </Button>
                </Link>
              </div>

              {/* Buddy Unlimited */}
              <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow relative">
                <div className="absolute top-4 right-4 bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Users className="w-3 h-3" /> Best Value
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Buddy Unlimited</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">$150</span>
                  <span className="text-gray-600 ml-2">/ person/mo</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Unlimited shared sessions', 'Full gym access', 'Partner workout plans'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white">
                    Start Buddy Plan
                  </Button>
                </Link>
              </div>

              {/* Meal Plan */}
              <div className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-shadow relative">
                <div className="absolute top-4 right-4 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold flex items-center gap-1">
                  <Utensils className="w-3 h-3" /> Add-on
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-800">Meal Plan</h3>
                <div className="mb-6">
                  <span className="text-5xl font-bold bg-gradient-to-r from-pink-600 to-purple-600 bg-clip-text text-transparent">$75</span>
                  <span className="text-gray-600 ml-2">/ month</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {['Customized meal plans', 'Grocery shopping lists', 'Dietary adjustments'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-gray-700">
                      <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs">✓</span>
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white">
                    Get Nutrition Plan
                  </Button>
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl font-bold mb-6">Ready to Start Your Journey?</h2>
            <p className="text-xl mb-8">Join Foundation Fitness today and achieve your fitness goals</p>
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
