import { ActivityIndicator, Text, View } from 'react-native'
import { Redirect } from 'expo-router'

import { colors } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'

export default function IndexScreen() {
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

  if (startupError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        <View
          style={{
            width: '100%',
            borderRadius: 24,
            borderWidth: 1,
            borderColor: '#fde1e1',
            backgroundColor: '#fff5f5',
            padding: 20,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
            FoundFit could not start
          </Text>
          <Text style={{ lineHeight: 22, color: colors.textMuted }}>{startupError}</Text>
        </View>
      </View>
    )
  }

  return <Redirect href={session ? '/dashboard' : '/login'} />
}
