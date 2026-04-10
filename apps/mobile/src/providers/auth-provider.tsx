'use client'

import type { PropsWithChildren } from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { envValidationError } from '@/lib/env'
import { supabase } from '@/lib/supabase'

type AuthContextValue = {
  session: Session | null
  loading: boolean
  startupError: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (fullName: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [startupError, setStartupError] = useState<string | null>(envValidationError)

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let isMounted = true

    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (isMounted) {
          setSession(data.session)
          setLoading(false)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setStartupError(error instanceof Error ? error.message : 'Could not restore your session.')
          setSession(null)
          setLoading(false)
        }
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signIn(email: string, password: string) {
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
  }

  async function signUp(fullName: string, email: string, password: string) {
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
  }

  async function signOut() {
    if (!supabase) {
      throw new Error(startupError || 'Supabase is not configured for this build.')
    }

    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }
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
