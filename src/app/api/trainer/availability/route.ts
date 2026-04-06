import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function getTrainerIdForUser(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: trainer, error } = await supabase
    .from('trainers')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (error || !trainer) {
    return null
  }

  return trainer.id as string
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unexpected server error'
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const trainerId = await getTrainerIdForUser(supabase, user.id)
    if (!trainerId) return NextResponse.json({ error: 'Trainer profile not found' }, { status: 404 })

    const { data, error } = await supabase
      .from('availability_blocks')
      .select('*')
      .eq('trainer_id', trainerId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const trainerId = await getTrainerIdForUser(supabase, user.id)
    if (!trainerId) return NextResponse.json({ error: 'Trainer profile not found' }, { status: 404 })

    const body = await req.json()
    const { day_of_week, start_time, end_time } = body

    if (day_of_week == null || !start_time || !end_time) {
      return NextResponse.json({ error: 'day_of_week, start_time, and end_time are required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('availability_blocks')
      .insert({
        trainer_id: trainerId,
        day_of_week,
        start_time,
        end_time,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json({ data })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const trainerId = await getTrainerIdForUser(supabase, user.id)
    if (!trainerId) return NextResponse.json({ error: 'Trainer profile not found' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const { error } = await supabase
      .from('availability_blocks')
      .delete()
      .eq('id', id)
      .eq('trainer_id', trainerId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}
