import { ActivityIndicator, View } from 'react-native'
import { Redirect, Stack } from 'expo-router'

import { colors } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'

export default function AuthLayout() {
  const { session, loading, startupError } = useAuth()

  if (loading) {
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

  if (session) {
    return <Redirect href="/(app)/dashboard" />
  }

  if (startupError) {
    return <Redirect href="/" />
  }

  return <Stack screenOptions={{ headerShown: false }} />
}
