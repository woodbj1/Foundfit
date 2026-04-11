import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'

import { envValidationError } from '@/lib/env'
import { getSupabaseClient, type MobileSession } from '@/lib/supabase'

type AuthContextValue = {
  session: MobileSession | null
  loading: boolean
  startupError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (fullName: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<MobileSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [startupError, setStartupError] = useState<string | null>(envValidationError)

  useEffect(() => {
    let isMounted = true
    let unsubscribe: (() => void) | null = null

    async function restoreSession() {
      if (envValidationError) {
        if (isMounted) {
          setLoading(false)
        }
        return
      }

      try {
        const supabase = await getSupabaseClient()

        if (!supabase) {
          if (isMounted) {
            setLoading(false)
          }
          return
        }

        const { data } = await supabase.auth.getSession()

        if (!isMounted) {
          return
        }

        setSession(data.session)
        setStartupError(null)
        setLoading(false)

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, nextSession) => {
          if (!isMounted) {
            return
          }

          setSession(nextSession)
          setStartupError(null)
          setLoading(false)
        })

        unsubscribe = () => subscription.unsubscribe()
      } catch (error) {
        if (isMounted) {
          setStartupError(error instanceof Error ? error.message : 'Could not restore your session.')
          setSession(null)
          setLoading(false)
        }
      }
    }

    void restoreSession()

    return () => {
      isMounted = false
      unsubscribe?.()
    }
  }, [])

  async function signIn(email: string, password: string) {
    const supabase = await getSupabaseClient()

    if (!supabase) {
      throw new Error(startupError || 'Supabase is not configured for this build.')
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    setStartupError(null)
  }

  async function signUp(fullName: string, email: string, password: string) {
    const supabase = await getSupabaseClient()

    if (!supabase) {
      throw new Error(startupError || 'Supabase is not configured for this build.')
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'client',
        },
      },
    })

    if (error) {
      throw error
    }

    setStartupError(null)
  }

  async function signOut() {
    const supabase = await getSupabaseClient()

    if (!supabase) {
      throw new Error(startupError || 'Supabase is not configured for this build.')
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }

    setStartupError(null)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        startupError,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
