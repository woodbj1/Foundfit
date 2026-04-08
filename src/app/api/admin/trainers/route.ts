import { NextRequest, NextResponse } from 'next/server'
import { getAppUrlForPath } from '@/lib/app-url'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'
import { SITE } from '@/lib/site-config'

interface ExistingProfile {
  id: string
  full_name: string | null
  role: string
  email: string
}

interface TrainerRecord {
  id: string
}

function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function trainerWelcomeEmail(
  fullName: string,
  email: string,
  request: NextRequest,
  tempPassword?: string
) {
  const setupUrl = getAppUrlForPath(`/trainer-setup?email=${encodeURIComponent(email)}`, request)

  return {
    subject: `Your ${SITE.name} trainer setup is ready`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #7c3aed, #ec4899); padding: 32px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to ${SITE.name}</h1>
        </div>
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
          <p style="font-size: 16px; color: #374151;">Hey ${fullName}, your trainer account is ready.</p>
          <div style="background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p style="margin: 4px 0; color: #4b5563;"><strong>Email:</strong> ${email}</p>
            ${tempPassword ? `<p style="margin: 4px 0; color: #4b5563;"><strong>Temporary password:</strong> ${tempPassword}</p>` : ''}
          </div>
          <p style="color: #6b7280;">
            Use the link below to finish setup, create your password, and connect your personal Google Calendar so only your availability is used for bookings.
          </p>
          <a href="${setupUrl}"
             style="display: inline-block; background: #7c3aed; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 8px;">
            Finish Trainer Setup &rarr;
          </a>
        </div>
      </div>
    `,
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const email = String(body.email || '').trim().toLowerCase()
    const fullName = String(body.fullName || '').trim()

    if (!email || !fullName) {
      return NextResponse.json({ error: 'email and fullName are required' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const tempPassword = generatePassword()

    const { data: existingProfile } = await admin
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('email', email)
      .maybeSingle()

    const normalizedExistingProfile = existingProfile as ExistingProfile | null
    let userId = normalizedExistingProfile?.id

    if (!userId) {
      const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      })

      if (createError) {
        throw createError
      }

      userId = createdUser.user?.id
    }

    if (!userId) {
      throw new Error('Failed to create or locate trainer user')
    }

    const profilePayload = {
      full_name: fullName,
      email,
      role: 'trainer',
    }

    let updateProfileError: { message?: string } | null = null

    if (normalizedExistingProfile?.id) {
      const { error } = await admin.from('profiles').update(profilePayload).eq('id', userId)
      updateProfileError = error
    } else {
      const { error } = await admin
        .from('profiles')
        .upsert({ id: userId, ...profilePayload }, { onConflict: 'id' })
      updateProfileError = error
    }

    if (updateProfileError) {
      throw updateProfileError
    }

    const { data: authUserResult, error: authUserError } = await admin.auth.admin.getUserById(userId)
    if (authUserError) {
      throw authUserError
    }

    const nextAppMetadata = {
      ...(authUserResult.user?.app_metadata ?? {}),
      role: 'trainer',
    }

    if (authUserResult.user?.app_metadata?.role !== 'trainer') {
      const { error: authUpdateError } = await admin.auth.admin.updateUserById(userId, {
        app_metadata: nextAppMetadata,
      })

      if (authUpdateError) {
        throw authUpdateError
      }
    }

    const { data: trainerRecord } = await admin
      .from('trainers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    const normalizedTrainerRecord = trainerRecord as TrainerRecord | null

    if (!normalizedTrainerRecord?.id) {
      const { error: trainerInsertError } = await admin.from('trainers').insert({
        user_id: userId,
        is_active: true,
      })

      if (trainerInsertError) {
        throw trainerInsertError
      }
    } else {
      const { error: trainerUpdateError } = await admin
        .from('trainers')
        .update({ is_active: true })
        .eq('id', normalizedTrainerRecord.id)

      if (trainerUpdateError) {
        throw trainerUpdateError
      }
    }

    const shouldSendPassword = !normalizedExistingProfile?.id
    let emailedCredentials = false

    if (process.env.RESEND_API_KEY) {
      try {
        const emailData = trainerWelcomeEmail(
          fullName,
          email,
          req,
          shouldSendPassword ? tempPassword : undefined
        )
        await sendEmail({ to: email, ...emailData })
        emailedCredentials = true
      } catch (emailError) {
        console.error('[POST /api/admin/trainers] welcome email failed', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      createdUser: !normalizedExistingProfile?.id,
      emailedCredentials,
    })
  } catch (err: unknown) {
    console.error('[POST /api/admin/trainers]', err)

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create trainer' },
      { status: 500 }
    )
  }
}
