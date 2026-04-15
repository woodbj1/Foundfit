// MINIMAL TEST BUILD - stripped to isolate crash cause
// All native module imports removed. If this still crashes,
// the issue is in React Native / Expo / iOS compatibility, not our app code.

import { Stack } from 'expo-router'
import { Text, View, StyleSheet } from 'react-native'

export default function RootLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fbf6fd' }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#fbf6fd' },
        }}
      />
    </View>
  )
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <View style={styles.errorScreen}>
      <Text style={styles.errorTitle}>FoundFit Error</Text>
      <Text style={styles.errorBody}>{error.message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fbf6fd',
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#241033',
  },
  errorBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6c587c',
  },
})
