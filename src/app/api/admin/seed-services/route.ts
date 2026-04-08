import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_SERVICES } from '@/lib/default-services'

export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const results: Array<{ name: string; action: 'created' | 'updated' }> = []

    for (const service of DEFAULT_SERVICES) {
      const { data: existing } = await supabase
        .from('services')
        .select('id')
        .eq('name', service.name)
        .limit(1)
        .maybeSingle()

      if (existing?.id) {
        const { error } = await supabase
          .from('services')
          .update(service)
          .eq('id', existing.id)

        if (error) throw error
        results.push({ name: service.name, action: 'updated' })
      } else {
        const { error } = await supabase
          .from('services')
          .insert(service)

        if (error) throw error
        results.push({ name: service.name, action: 'created' })
      }
    }

    revalidatePath('/')

    return NextResponse.json({ success: true, data: results })
  } catch (error: unknown) {
    console.error('[POST /api/admin/seed-services]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to seed services' },
      { status: 500 }
    )
  }
}
