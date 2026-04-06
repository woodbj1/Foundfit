import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

function readEnvFile(filePath) {
  try {
    return Object.fromEntries(
      readFileSync(filePath, 'utf8')
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith('#'))
        .map((line) => {
          const separatorIndex = line.indexOf('=')
          return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)]
        })
    )
  } catch {
    return {}
  }
}

function normalizeMealPlanPath(fileUrl) {
  if (!fileUrl) {
    return fileUrl
  }

  const normalized = fileUrl
    .replace(/^https?:\/\/[^/]+\/storage\/v1\/object\/(?:public|sign)\/meal-plans\//, '')
    .replace(/\?.*$/, '')

  return normalized
}

async function listAllUsers(supabase) {
  const users = []
  let page = 1
  const perPage = 100

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })

    if (error) {
      throw error
    }

    const batch = data.users ?? []
    users.push(...batch)

    if (batch.length < perPage) {
      return users
    }

    page += 1
  }
}

async function main() {
  const env = {
    ...readEnvFile(resolve('.env')),
    ...readEnvFile(resolve('.env.local')),
    ...process.env,
  }

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  const summary = {
    bucketPrivatized: false,
    syncedRoles: [],
    normalizedMealPlans: [],
    missingProfiles: [],
  }

  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
  if (bucketsError) {
    throw bucketsError
  }

  const mealPlansBucket = buckets.find((bucket) => bucket.id === 'meal-plans')
  if (mealPlansBucket?.public) {
    const { data, error } = await supabase.storage.updateBucket('meal-plans', {
      public: false,
    })

    if (error) {
      throw error
    }

    summary.bucketPrivatized = Boolean(data)
  }

  const [{ data: profiles, error: profilesError }, { data: mealPlans, error: mealPlansError }, users] =
    await Promise.all([
      supabase.from('profiles').select('id, role, email, full_name'),
      supabase.from('meal_plans').select('id, file_url'),
      listAllUsers(supabase),
    ])

  if (profilesError) {
    throw profilesError
  }

  if (mealPlansError) {
    throw mealPlansError
  }

  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))

  for (const user of users) {
    const profile = profilesById.get(user.id)

    if (!profile) {
      summary.missingProfiles.push({
        id: user.id,
        email: user.email ?? null,
      })
      continue
    }

    if (user.app_metadata?.role === profile.role) {
      continue
    }

    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      app_metadata: {
        ...(user.app_metadata ?? {}),
        role: profile.role,
      },
    })

    if (error) {
      throw error
    }

    summary.syncedRoles.push({
      id: user.id,
      email: user.email ?? null,
      role: profile.role,
    })
  }

  for (const mealPlan of mealPlans ?? []) {
    const normalizedPath = normalizeMealPlanPath(mealPlan.file_url)

    if (normalizedPath === mealPlan.file_url) {
      continue
    }

    const { error } = await supabase
      .from('meal_plans')
      .update({ file_url: normalizedPath })
      .eq('id', mealPlan.id)

    if (error) {
      throw error
    }

    summary.normalizedMealPlans.push({
      id: mealPlan.id,
      file_url: normalizedPath,
    })
  }

  console.log(JSON.stringify(summary, null, 2))
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2
    )
  )
  process.exit(1)
})
