import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureProfileAndRole } from '@/lib/supabase/auth-repair'
import Sidebar from '@/components/nav/sidebar'
import type { UserRole } from '@/lib/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const profile = await ensureProfileAndRole(user)

  if (profile.role === 'trainer') {
    const { data: trainer } = await supabase
      .from('trainers')
      .select('onboarding_completed_at')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!trainer?.onboarding_completed_at) {
      redirect('/trainer-setup')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={profile.role as UserRole} userName={profile.full_name || profile.email} />
      <main className="lg:pl-64">
        <div className="pt-16 lg:pt-0">
          <div className="max-w-7xl mx-auto p-4 md:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
