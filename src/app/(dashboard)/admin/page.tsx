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

function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const supabase = createClient()

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
      setTrainers(data || [])
    } catch (err: any) {
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
      fetchTrainers()
    })
  }, [router, supabase, fetchTrainers])

  const handleAddTrainer = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)

    const tempPassword = generatePassword()

    try {
      const { data, error } = await supabase.functions.invoke('create-user-admin', {
        body: {
          email: newTrainer.email,
          password: tempPassword,
          fullName: newTrainer.fullName,
          role: 'trainer',
        },
      })

      if (error) throw new Error(error.message || 'Failed to invoke creation function')
      if (data && !data.success) throw new Error(data.error || 'Unknown server error')

      toast.success(`${newTrainer.fullName} added. Temporary password sent to their email.`)
      setNewTrainer({ email: '', fullName: '' })
      await fetchTrainers()
    } catch (err: any) {
      let msg = 'Could not create trainer account.'
      if (err.message?.includes('already registered')) msg = 'This email is already registered.'
      else if (err.message) msg = err.message
      toast.error(msg)
    } finally {
      setIsAdding(false)
    }
  }

  if (loading && trainers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
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
          <LogOut className="h-4 w-4 mr-2" /> Logout
        </Button>
      </div>

      <Tabs defaultValue="trainers" className="space-y-6">
        <TabsList className="bg-white p-1 rounded-xl shadow-sm border border-gray-100 w-full sm:w-auto flex overflow-x-auto">
          <TabsTrigger
            value="trainers"
            className="px-6 py-2.5 rounded-lg data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 font-medium transition-all"
          >
            Manage Trainers
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="px-6 py-2.5 rounded-lg data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 font-medium transition-all"
          >
            Services &amp; Pricing
          </TabsTrigger>
          <TabsTrigger
            value="integrations"
            className="px-6 py-2.5 rounded-lg data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 font-medium transition-all flex items-center gap-2"
          >
            <Puzzle className="h-4 w-4" /> Integrations
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Manage Trainers */}
        <TabsContent value="trainers" className="focus-visible:outline-none">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Add New Trainer Form */}
            <div className="md:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 sticky top-24">
                <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-purple-600" />
                  Add New Trainer
                </h2>
                <form onSubmit={handleAddTrainer} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Full Name</label>
                    <Input
                      value={newTrainer.fullName}
                      onChange={(e) => setNewTrainer((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder="e.g. Sarah Smith"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Email Address</label>
                    <Input
                      type="email"
                      value={newTrainer.email}
                      onChange={(e) => setNewTrainer((p) => ({ ...p, email: e.target.value }))}
                      placeholder="trainer@example.com"
                      required
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    A secure temporary password will be auto-generated and sent to the trainer&apos;s email.
                  </p>
                  <Button
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                    disabled={isAdding}
                  >
                    {isAdding ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      'Create Trainer Account'
                    )}
                  </Button>
                </form>
              </div>
            </div>

            {/* Current Trainers List */}
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Current Trainers
                  </h2>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" onClick={fetchTrainers} disabled={loading}>
                      <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
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
                        className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold">
                            {trainer.full_name?.charAt(0) || 'T'}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{trainer.full_name}</p>
                            <p className="text-sm text-gray-500">{trainer.email}</p>
                          </div>
                        </div>
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium border border-green-200">
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

        {/* Tab 2: Services & Pricing */}
        <TabsContent value="services" className="focus-visible:outline-none">
          <ServiceManagement />
        </TabsContent>

        {/* Tab 3: Integrations */}
        <TabsContent value="integrations" className="focus-visible:outline-none">
          <div className="opacity-60 pointer-events-none grayscale max-w-sm">
            <div className="bg-white rounded-lg border border-dashed border-gray-300 p-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
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
