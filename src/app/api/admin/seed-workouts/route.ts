import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { EXERCISE_LIBRARY, WORKOUT_BLOCKS } from '@/lib/workout-catalog'

export async function POST() {
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

  // Seed exercises
  const exerciseRows = Object.values(EXERCISE_LIBRARY).map((ex) => ({
    slug: ex.id,
    name: ex.name,
    body_parts: ex.bodyParts,
    goals: ex.goals,
    equipment: ex.equipment,
    summary: ex.summary,
    setup: ex.setup,
    how_to: ex.howTo,
    coaching_cues: ex.coachingCues,
    common_mistakes: ex.commonMistakes,
    demo_video_url: ex.demoVideoUrl ?? null,
  }))

  const { error: exError } = await admin
    .from('exercises')
    .upsert(exerciseRows, { onConflict: 'slug' })

  if (exError) {
    return NextResponse.json({ error: `Exercises: ${exError.message}` }, { status: 500 })
  }

  // Get the inserted exercise slugs → ids mapping
  const { data: dbExercises } = await admin
    .from('exercises')
    .select('id, slug')

  const slugToId: Record<string, string> = {}
  for (const ex of dbExercises ?? []) {
    slugToId[ex.slug] = ex.id
  }

  // Seed workout blocks
  const blockRows = WORKOUT_BLOCKS.map((block) => ({
    slug: block.id,
    title: block.title,
    summary: block.summary,
    body_part: block.bodyPart,
    goal: block.goal,
    duration_minutes: block.durationMinutes,
    equipment: block.equipment,
    level: block.level,
    trainer_note: block.trainerNote,
  }))

  const { error: blockError } = await admin
    .from('workout_blocks')
    .upsert(blockRows, { onConflict: 'slug' })

  if (blockError) {
    return NextResponse.json({ error: `Blocks: ${blockError.message}` }, { status: 500 })
  }

  // Get block slugs → ids
  const { data: dbBlocks } = await admin
    .from('workout_blocks')
    .select('id, slug')

  const blockSlugToId: Record<string, string> = {}
  for (const b of dbBlocks ?? []) {
    blockSlugToId[b.slug] = b.id
  }

  // Seed block-exercise links (delete existing first, then insert)
  for (const block of WORKOUT_BLOCKS) {
    const blockId = blockSlugToId[block.id]
    if (!blockId) continue

    await admin.from('workout_block_exercises').delete().eq('block_id', blockId)

    const rows = block.exercises
      .map((ex, i) => {
        const exerciseId = slugToId[ex.exerciseId]
        if (!exerciseId) return null
        return {
          block_id: blockId,
          exercise_id: exerciseId,
          sort_order: i,
          prescription: ex.prescription,
          rest: ex.rest,
          note: ex.note || null,
        }
      })
      .filter(Boolean)

    if (rows.length > 0) {
      await admin.from('workout_block_exercises').insert(rows)
    }
  }

  return NextResponse.json({
    message: 'Workout studio seeded successfully.',
    exercises: exerciseRows.length,
    blocks: blockRows.length,
  })
}
