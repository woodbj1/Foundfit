import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  const { client_id, title, file_url } = body

  if (!client_id || !title || !file_url) {
    return NextResponse.json({ error: 'client_id, title, and file_url are required' }, { status: 400 })
  }

  // Send notification email to client
  try {
    const { data: clientProfile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', client_id)
      .single()

    if (clientProfile?.email) {
      const emailData = mealPlanEmail(clientProfile.full_name || 'there', title)

      // Fetch the PDF to attach
      try {
        const pdfResponse = await fetch(file_url)
        const pdfBuffer = Buffer.from(await pdfResponse.arrayBuffer())

        await sendEmail({
          to: clientProfile.email,
          ...emailData,
          attachments: [{ filename: `${title}.pdf`, content: pdfBuffer }],
        })
      } catch {
        // Send without attachment if fetch fails
        await sendEmail({ to: clientProfile.email, ...emailData })
      }
    }
  } catch (error) {
    console.error('Failed to send meal plan email:', error)
  }

  return NextResponse.json({ success: true })
}
