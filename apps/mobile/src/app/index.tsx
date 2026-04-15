// MINIMAL TEST BUILD - stripped to isolate crash cause
import { Text, View } from 'react-native'

export default function IndexScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fbf6fd',
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: '800', color: '#241033' }}>
        FoundFit
      </Text>
      <Text style={{ fontSize: 16, color: '#6c587c', marginTop: 8 }}>
        Minimal test build - if you see this, the app launched successfully!
      </Text>
      <Text style={{ fontSize: 13, color: '#9a8aac', marginTop: 24 }}>
        Build 18 - Isolation Test
      </Text>
    </View>
  )
}
}
