import { ActivityIndicator, View } from 'react-native'
import { Redirect } from 'expo-router'

import { colors } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'

export default function IndexScreen() {
  const { session, loading } = useAuth()

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

  return <Redirect href={session ? '/(app)/dashboard' : '/login'} />
}
