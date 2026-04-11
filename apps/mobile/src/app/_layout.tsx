import 'react-native-gesture-handler'
import '@/lib/runtime-errors'

import { Stack } from 'expo-router'
import type { ErrorBoundaryProps } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import type { ComponentType, PropsWithChildren } from 'react'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { colors } from '@/lib/theme'
import { envValidationError } from '@/lib/env'
import { getLatestRuntimeError, subscribeToRuntimeErrors } from '@/lib/runtime-errors'

type AuthProviderComponent = ComponentType<PropsWithChildren>

export default function RootLayout() {
  const [runtimeError, setRuntimeError] = useState<string | null>(getLatestRuntimeError())
  const [providerError, setProviderError] = useState<string | null>(null)
  const [AuthProviderComponent, setAuthProviderComponent] = useState<AuthProviderComponent | null>(null)

  useEffect(() => {
    return subscribeToRuntimeErrors(setRuntimeError)
  }, [])

  useEffect(() => {
    let isMounted = true

    void import('@/providers/auth-provider')
      .then((module) => {
        if (isMounted) {
          setAuthProviderComponent(() => module.AuthProvider)
          setProviderError(null)
        }
      })
      .catch((error) => {
        if (isMounted) {
          setProviderError(error instanceof Error ? error.message : 'Could not load authentication.')
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const launchError = envValidationError || runtimeError || providerError

  if (launchError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.errorScreen}>
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>FoundFit needs a quick configuration fix</Text>
              <Text style={styles.errorBody}>{launchError}</Text>
            </View>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    )
  }

  if (!AuthProviderComponent) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.loadingScreen}>
            <Text style={styles.loadingTitle}>FoundFit</Text>
            <Text style={styles.loadingBody}>Starting your mobile studio...</Text>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProviderComponent>
          <StatusBar style="dark" backgroundColor={colors.background} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </AuthProviderComponent>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

export function ErrorBoundary({ error }: ErrorBoundaryProps) {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={styles.errorScreen}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>FoundFit hit an app error</Text>
            <Text style={styles.errorBody}>
              {error.message || 'The app ran into a startup issue before the first screen could finish loading.'}
            </Text>
          </View>
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
    backgroundColor: colors.background,
  },
  loadingTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  loadingBody: {
    fontSize: 15,
    color: colors.textMuted,
  },
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: colors.background,
  },
  errorCard: {
    borderRadius: 24,
    padding: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 12,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  errorBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
  },
})
