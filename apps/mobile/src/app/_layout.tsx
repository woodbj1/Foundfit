import 'react-native-gesture-handler'
import '@/lib/runtime-errors'

import { Stack } from 'expo-router'
import type { ErrorBoundaryProps } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { colors } from '@/lib/theme'
import { envValidationError } from '@/lib/env'
import { getLatestRuntimeError, subscribeToRuntimeErrors } from '@/lib/runtime-errors'
import { AuthProvider } from '@/providers/auth-provider'

export default function RootLayout() {
  const [runtimeError, setRuntimeError] = useState<string | null>(getLatestRuntimeError())

  useEffect(() => {
    return subscribeToRuntimeErrors(setRuntimeError)
  }, [])

  if (envValidationError || runtimeError) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View style={styles.errorScreen}>
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>FoundFit needs a quick configuration fix</Text>
              <Text style={styles.errorBody}>{envValidationError || runtimeError}</Text>
            </View>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    )
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="dark" backgroundColor={colors.background} />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          />
        </AuthProvider>
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
