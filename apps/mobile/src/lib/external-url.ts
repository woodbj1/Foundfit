import { Alert, Linking } from 'react-native'

export async function openExternalUrl(
  url: string,
  failureMessage = 'Could not open the link.'
) {
  try {
    const supported = await Linking.canOpenURL(url)

    if (!supported) {
      throw new Error('This link is not supported on your device.')
    }

    await Linking.openURL(url)
  } catch (error) {
    Alert.alert(
      'Link unavailable',
      error instanceof Error ? error.message : failureMessage
    )
  }
}
