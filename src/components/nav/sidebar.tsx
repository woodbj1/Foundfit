'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Calendar,
  Clock,
  UtensilsCrossed,
  User,
  Settings,
  Users,
  Package,
  LogOut,
  Menu,
  ShieldCheck,
} from 'lucide-react'
import BrandLogo from '@/components/brand/brand-logo'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import type { UserRole } from '@/lib/types'
import { cn } from '@/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const clientNav: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Book Session', href: '/book', icon: Calendar },
  { label: 'My Sessions', href: '/sessions', icon: Clock },
  { label: 'Meal Plans', href: '/meal-plans', icon: UtensilsCrossed },
  { label: 'Account', href: '/account', icon: User },
]

const trainerNav: NavItem[] = [
  { label: 'Dashboard', href: '/trainer', icon: LayoutDashboard },
  { label: 'Availability', href: '/trainer/availability', icon: Clock },
  { label: 'Bookings', href: '/trainer/bookings', icon: Calendar },
  { label: 'Clients', href: '/trainer/clients', icon: Users },
  { label: 'Meal Plans', href: '/trainer/meal-plans', icon: UtensilsCrossed },
]

const adminNav: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Services', href: '/admin/services', icon: Package },
  { label: 'Trainers', href: '/admin/trainers', icon: ShieldCheck },
  { label: 'Clients', href: '/admin/clients', icon: Users },
  { label: 'Bookings', href: '/admin/bookings', icon: Calendar },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
]

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'admin':
      return [...adminNav, ...trainerNav.filter(i => !adminNav.some(a => a.label === i.label))]
    case 'trainer':
      return trainerNav
    default:
      return clientNav
  }
}

function NavLinks({ items, pathname, onClick }: { items: NavItem[]; pathname: string; onClick?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClick}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}

export default function Sidebar({ role, userName }: { role: UserRole; userName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const navItems = getNavItems(role)

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-6">
        <Link href="/" className="flex items-center gap-2">
              <BrandLogo imageClassName="h-20 w-auto max-w-[120px]" />
        </Link>
      </div>

      <div className="px-4 flex-1">
        <NavLinks items={navItems} pathname={pathname} onClick={() => setOpen(false)} />
      </div>

      <Separator />

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3 px-3">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{userName}</p>
            <p className="text-xs text-muted-foreground capitalize">{role}</p>
          </div>
        </div>
        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
          Log Out
        </Button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile hamburger */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
                  <BrandLogo imageClassName="h-16 w-auto max-w-[100px]" />
        </Link>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground">
              <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            {sidebarContent}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-white">
        {sidebarContent}
      </aside>
    </>
  )
}
