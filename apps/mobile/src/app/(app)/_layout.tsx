import { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { Redirect, Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { apiRequest } from '@/lib/api'
import { env } from '@/lib/env'
import { openExternalUrl } from '@/lib/external-url'
import { colors } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'
import type { MobileSubscriptionStatusResponse } from '@/types/foundfit'

function SubscriptionGate({ onLogout }: { onLogout: () => void }) {
  return (
    <View style={gateStyles.container}>
      <Ionicons name="lock-closed-outline" size={64} color={colors.textMuted} />
      <Text style={gateStyles.title}>Virtual Studio Membership Required</Text>
      <Text style={gateStyles.body}>
        Subscribe to the FoundFit Virtual Studio ($50/month) to access live workouts,
        1-on-1 virtual sessions, and the full workout library.
      </Text>
      <View style={gateStyles.button} onTouchEnd={() => openExternalUrl(env.appUrl)}>
        <Text style={gateStyles.buttonText}>Subscribe on FoundFit.net</Text>
      </View>
      <View style={gateStyles.logoutButton} onTouchEnd={onLogout}>
        <Text style={gateStyles.logoutText}>Log Out</Text>
      </View>
    </View>
  )
}

const gateStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 24,
  },
  button: {
    marginTop: 8,
    backgroundColor: colors.primaryDark,
    borderRadius: 14,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  logoutButton: {
    marginTop: 4,
    paddingVertical: 10,
  },
  logoutText: {
    color: colors.textMuted,
    fontSize: 15,
  },
})

export default function AppLayout() {
  const { session, loading, startupError, signOut } = useAuth()
  const [subLoading, setSubLoading] = useState(true)
  const [isSubscribed, setIsSubscribed] = useState(false)

  const checkSubscription = useCallback(async () => {
    if (!session?.access_token) return
    try {
      const res = await apiRequest<MobileSubscriptionStatusResponse>(
        '/api/mobile/subscription-status',
        { accessToken: session.access_token },
      )
      setIsSubscribed(res.isSubscribed)
    } catch {
      // If we can't check, let them through to avoid locking out on network errors
      setIsSubscribed(true)
    } finally {
      setSubLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    if (session?.access_token) {
      void checkSubscription()
    }
  }, [session?.access_token, checkSubscription])

  if (loading || (session && subLoading)) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primaryDark} size="large" />
      </View>
    )
  }

  if (!session) {
    return <Redirect href="/login" />
  }

  if (startupError) {
    return <Redirect href="/" />
  }

  if (!isSubscribed) {
    return <SubscriptionGate onLogout={signOut} />
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primaryDark,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="live"
        options={{
          title: 'Live',
          tabBarIcon: ({ color, size }) => <Ionicons name="radio-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="book"
        options={{
          title: 'Book',
          tabBarIcon: ({ color, size }) => <Ionicons name="videocam-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="sessions"
        options={{
          title: 'Sessions',
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Studio',
          tabBarIcon: ({ color, size }) => <Ionicons name="barbell-outline" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" color={color} size={size} />,
        }}
      />
    </Tabs>
  )
}
