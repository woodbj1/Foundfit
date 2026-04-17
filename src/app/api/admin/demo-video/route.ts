import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const exerciseId = formData.get('exercise_id') as string | null

  if (!file || !exerciseId) {
    return NextResponse.json({ error: 'file and exercise_id are required.' }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ['video/mp4', 'video/webm', 'video/quicktime']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: 'Only mp4, webm, and mov files are allowed.' },
      { status: 400 }
    )
  }

  // Max 100MB
  if (file.size > 100 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 100MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() || 'mp4'
  const storagePath = `exercises/${exerciseId}/demo.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error: uploadError } = await admin.storage
    .from('demo-videos')
    .upload(storagePath, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: publicUrl } = admin.storage.from('demo-videos').getPublicUrl(storagePath)

  // Update exercise with storage path and public URL
  const { error: updateError } = await admin
    .from('exercises')
    .update({
      demo_video_storage_path: storagePath,
      demo_video_url: publicUrl.publicUrl,
    })
    .eq('id', exerciseId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    storage_path: storagePath,
    public_url: publicUrl.publicUrl,
  })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const admin = await createAdminClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    return NextResponse.json({ error: 'Admin access required.' }, { status: 403 })
  }

  const { exercise_id } = await request.json()
  if (!exercise_id) {
    return NextResponse.json({ error: 'exercise_id is required.' }, { status: 400 })
  }

  const { data: exercise } = await admin
    .from('exercises')
    .select('demo_video_storage_path')
    .eq('id', exercise_id)
    .single()

  if (exercise?.demo_video_storage_path) {
    await admin.storage.from('demo-videos').remove([exercise.demo_video_storage_path])
  }

  await admin
    .from('exercises')
    .update({ demo_video_storage_path: null, demo_video_url: null })
    .eq('id', exercise_id)

  return NextResponse.json({ success: true })
}
