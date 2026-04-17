import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'

const SYSTEM_PROMPT = `You are an expert personal trainer and exercise scientist. Generate exercise data in JSON format.

When generating an exercise, provide ALL fields:
- slug: lowercase_snake_case unique identifier
- name: Human-friendly exercise name
- body_parts: array from ["full-body","upper-body","lower-body","glutes","core","mobility"]
- goals: array from ["strength","hiit","sculpt","mobility"]
- equipment: array of equipment names (e.g. ["Dumbbells","Bodyweight"])
- summary: One sentence explaining the move
- setup: One sentence on starting position
- how_to: array of 3 clear instruction steps
- coaching_cues: array of 3 short coaching cues
- common_mistakes: array of 3 common mistakes

When generating a workout block, provide:
- slug: lowercase_snake_case unique identifier
- title: Descriptive block name
- summary: One sentence overview
- body_part: one of ["full-body","upper-body","lower-body","glutes","core","mobility"]
- goal: one of ["strength","hiit","sculpt","mobility"]
- duration_minutes: estimated time
- equipment: array of equipment names
- level: "beginner" or "intermediate"
- trainer_note: One motivational coaching note
- exercises: array of { exercise_slug, prescription, rest, note? }

Return valid JSON only. No markdown, no explanation.`

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

  const apiKey = process.env.KIMI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI is not configured. Set KIMI_API_KEY in your environment variables.' },
      { status: 503 }
    )
  }

  const body = await request.json()
  const { prompt, type = 'exercise' } = body

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required.' }, { status: 400 })
  }

  const userPrompt =
    type === 'block'
      ? `Generate a workout block based on this request: "${prompt}". Return a single JSON object with the workout block fields.`
      : `Generate an exercise based on this request: "${prompt}". Return a single JSON object with all exercise fields.`

  try {
    const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'kimi-k2-0711',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return NextResponse.json(
        { error: `AI provider error: ${response.status}`, details: errText },
        { status: 502 }
      )
    }

    const completion = await response.json()
    const content = completion.choices?.[0]?.message?.content ?? ''

    // Parse JSON from response (strip markdown code fences if present)
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const generated = JSON.parse(jsonStr)

    return NextResponse.json({ generated, type })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI generation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
