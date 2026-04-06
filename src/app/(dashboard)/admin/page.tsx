'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  LogOut,
  Puzzle,
  RefreshCw,
  Shield,
  UserPlus,
  Users,
} from 'lucide-react'
import ServiceManagement from '@/components/admin/service-management'
import { toast } from 'sonner'

type Trainer = {
  id: string
  full_name: string
  email: string
  role: string
}

type AddTrainerResponse = {
  createdUser?: boolean
  emailedCredentials?: boolean
  error?: string
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [newTrainer, setNewTrainer] = useState({ email: '', fullName: '' })

  const fetchTrainers = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'trainer')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTrainers((data as Trainer[]) || [])
    } catch {
      toast.error('Could not load trainers.')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      void fetchTrainers()
    })
  }, [router, supabase, fetchTrainers])

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const res = await fetch('/api/admin/trainers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newTrainer.email,
          fullName: newTrainer.fullName,
        }),
        signal: controller.signal,
      })

      const raw = await res.text()
      let data: AddTrainerResponse | null = null

      try {
        data = raw ? JSON.parse(raw) as AddTrainerResponse : null
      } catch {
        data = { error: raw || 'Unexpected server response' }
      }

      if (!res.ok) throw new Error(data?.error || 'Failed to create trainer account')

      const message = data?.createdUser
        ? `${newTrainer.fullName} added.${data?.emailedCredentials ? ' Login details were emailed.' : ' Account created, but email delivery is not configured.'}`
        : `${newTrainer.fullName} promoted to trainer and activated.`

      toast.success(message)
      setNewTrainer({ email: '', fullName: '' })
      await fetchTrainers()
    } catch (error: unknown) {
      let msg = 'Could not create trainer account.'

      if (error instanceof Error && error.name === 'AbortError') {
        msg = 'Trainer creation timed out. The server route may be hanging.'
      } else if (error instanceof Error && error.message.includes('already registered')) {
        msg = 'This email is already registered.'
      } else if (error instanceof Error && error.message) {
        msg = error.message
      }

      toast.error(msg)
      console.error('Add trainer failed:', error)
    } finally {
      clearTimeout(timeout)
      setIsAdding(false)
    }
  }

  if (loading && trainers.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-purple-600" />
          <h1 className="text-xl font-bold text-gray-800">Admin Dashboard</h1>
        </div>
        <Button
          variant="ghost"
          onClick={async () => {
            await supabase.auth.signOut()
            router.push('/login')
          }}
          className="text-gray-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <Tabs defaultValue="trainers" className="space-y-6">
        <TabsList className="flex w-full overflow-x-auto rounded-xl border border-gray-100 bg-white p-1 shadow-sm sm:w-auto">
          <TabsTrigger
            value="trainers"
            className="rounded-lg px-6 py-2.5 font-medium transition-all data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
          >
            Manage Trainers
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="rounded-lg px-6 py-2.5 font-medium transition-all data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
          >
            Services &amp; Pricing
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="flex items-center gap-2 rounded-lg px-6 py-2.5 font-medium transition-all data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700"
          >
            <Puzzle className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trainers" className="focus-visible:outline-none">
          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1">
              <div className="sticky top-24 rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-gray-800">
                  <UserPlus className="h-5 w-5 text-purple-600" />
                  Add New Trainer
                </h2>
                <form onSubmit={handleAddTrainer} className="space-y-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                    <Input
                      value={newTrainer.fullName}
                      onChange={(e) => setNewTrainer((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="e.g. Sarah Smith"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
                    <Input
                      type="email"
                      value={newTrainer.email}
                      onChange={(e) => setNewTrainer((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="trainer@example.com"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    New users get emailed a temporary password. Existing users are upgraded in place.
                  </p>
                  <Button
                    type="submit"
                    className="w-full bg-purple-600 text-white hover:bg-purple-700"
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      'Create Trainer Account'
                    )}
                  </Button>
                </form>
              </div>
            </div>

            <div className="md:col-span-2">
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-gray-100 p-6">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800">
                    <Users className="h-5 w-5 text-purple-600" />
                    Current Trainers
                  </h2>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchTrainers} disabled={loading}>
                      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
                      {trainers.length} Active
                    </Badge>
                  </div>
                </div>
                {trainers.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No trainers found. Add one to get started.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {trainers.map((trainer) => (
                      <div
                        key={trainer.id}
                        className="flex items-center justify-between p-6 transition-colors hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 font-bold text-purple-600">
                            {trainer.full_name?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{trainer.full_name}</p>
                            <p className="text-sm text-gray-500">{trainer.email}</p>
                          </div>
                        </div>
                        <span className="rounded-full border border-green-200 bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                          Trainer
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="services" className="focus-visible:outline-none">
          <ServiceManagement />
        </TabsContent>

        <TabsContent value="integrations" className="focus-visible:outline-none">
          <div className="pointer-events-none max-w-sm grayscale opacity-60">
            <div className="flex flex-col items-center justify-center space-y-4 rounded-lg border border-dashed border-gray-300 bg-white p-10 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100">
                <Puzzle className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-500">More Coming Soon</h3>
                <p className="text-sm text-gray-400">Future integrations will appear here.</p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
