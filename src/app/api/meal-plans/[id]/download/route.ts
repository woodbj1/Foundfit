import { NextResponse } from 'next/server'
import { normalizeMealPlanStoragePath } from '@/lib/meal-plans'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: mealPlan, error } = await supabase
    .from('meal_plans')
    .select('id, file_url')
    .eq('id', id)
    .single()

  if (error || !mealPlan) {
    return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
  }

  const storagePath = normalizeMealPlanStoragePath(mealPlan.file_url)
  const admin = await createAdminClient()
  const { data: signedUrlData, error: signedUrlError } = await admin.storage
    .from('meal-plans')
    .createSignedUrl(storagePath, 60)

  if (signedUrlError || !signedUrlData?.signedUrl) {
    console.error('[GET /api/meal-plans/[id]/download]', signedUrlError)
    return NextResponse.json({ error: 'Failed to create download link' }, { status: 500 })
  }

  return NextResponse.redirect(signedUrlData.signedUrl)
}
