import { NextRequest, NextResponse } from 'next/server'
import { normalizeMealPlanStoragePath } from '@/lib/meal-plans'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendEmail, mealPlanEmail } from '@/lib/email'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Verify trainer/admin
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['trainer', 'admin'].includes(profile.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await request.json()
  const { meal_plan_id } = body

  if (!meal_plan_id) {
    return NextResponse.json({ error: 'meal_plan_id is required' }, { status: 400 })
  }

  try {
    const { data: mealPlan } = await supabase
      .from('meal_plans')
      .select('id, client_id, title, file_url')
      .eq('id', meal_plan_id)
      .single()

    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', mealPlan.client_id)
      .single()

    if (clientProfile?.email) {
      const emailData = mealPlanEmail(clientProfile.full_name || 'there', mealPlan.title)
      const storagePath = normalizeMealPlanStoragePath(mealPlan.file_url)
      const admin = await createAdminClient()

      try {
        const { data: fileData, error: downloadError } = await admin.storage
          .from('meal-plans')
          .download(storagePath)

        if (downloadError) {
          throw downloadError
        }

        const pdfBuffer = Buffer.from(await fileData.arrayBuffer())

        await sendEmail({
          to: clientProfile.email,
          ...emailData,
          attachments: [{ filename: `${mealPlan.title}.pdf`, content: pdfBuffer }],
        })
      } catch {
        await sendEmail({ to: clientProfile.email, ...emailData })
      }
    }
  } catch (error) {
    console.error('Failed to send meal plan email:', error)
  }

  return NextResponse.json({ success: true })
}
