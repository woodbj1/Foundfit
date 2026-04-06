import type { User } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/lib/types'
import { createServiceRoleClient } from '@/lib/supabase/server'

const PROFILE_COLUMNS = 'id, email, full_name, phone, address, role, avatar_url, timezone, booking_preference, created_at, updated_at'

function isUserRole(value: unknown): value is UserRole {
  return value === 'client' || value === 'trainer' || value === 'admin'
}

function getUserRole(user: User): UserRole {
  const appRole = user.app_metadata?.role
  if (isUserRole(appRole)) {
    return appRole
  }

  const userRole = user.user_metadata?.role
  if (isUserRole(userRole)) {
    return userRole
  }

  return 'client'
}

function getUserFullName(user: User): string {
  const fullName = user.user_metadata?.full_name
  if (typeof fullName === 'string') {
    return fullName.trim()
  }

  const name = user.user_metadata?.name
  if (typeof name === 'string') {
    return name.trim()
  }

  return ''
}

function getUserPhone(user: User): string | null {
  const phone = user.user_metadata?.phone
  if (typeof phone !== 'string') {
    return null
  }

  const normalizedPhone = phone.trim()
  return normalizedPhone || null
}

async function syncUserRoleMetadata(user: User, role: UserRole) {
  const currentRole = user.app_metadata?.role

  if (currentRole === role) {
    return
  }

  const admin = createServiceRoleClient()
  const nextAppMetadata = {
    ...(user.app_metadata ?? {}),
    role,
  }

  const { error } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: nextAppMetadata,
  })

  if (error) {
    throw error
  }
}

export async function ensureProfileAndRole(user: User): Promise<Profile> {
  const admin = createServiceRoleClient()
  const fallbackRole = getUserRole(user)
  const fullName = getUserFullName(user)
  const phone = getUserPhone(user)
  const email = user.email ?? ''

  const { data: existingProfile, error: existingProfileError } = await admin
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle()

  if (existingProfileError) {
    throw existingProfileError
  }

  let profile = existingProfile as Profile | null

  if (!profile) {
    const { data: insertedProfile, error: insertError } = await admin
      .from('profiles')
      .upsert(
        {
          id: user.id,
          email,
          full_name: fullName,
          phone,
          role: fallbackRole,
        },
        {
          onConflict: 'id',
        }
      )
      .select(PROFILE_COLUMNS)
      .single()

    if (insertError) {
      throw insertError
    }

    profile = insertedProfile as Profile
  } else {
    const updates: Partial<Profile> = {}

    if (email && profile.email !== email) {
      updates.email = email
    }

    if (fullName && profile.full_name !== fullName) {
      updates.full_name = fullName
    }

    if (phone && profile.phone !== phone) {
      updates.phone = phone
    }

    if (Object.keys(updates).length > 0) {
      const { data: updatedProfile, error: updateError } = await admin
        .from('profiles')
        .update(updates)
        .eq('id', user.id)
        .select(PROFILE_COLUMNS)
        .single()

      if (updateError) {
        throw updateError
      }

      profile = updatedProfile as Profile
    }
  }

  await syncUserRoleMetadata(user, profile.role)

  return profile
}
