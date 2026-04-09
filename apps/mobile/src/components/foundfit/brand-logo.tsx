import { Image } from 'expo-image'
import { StyleSheet, View } from 'react-native'

import FoundFitLogo from '../../../assets/images/brand/foundfit-logo-vertical.png'

type BrandLogoProps = {
  width?: number
}

export function BrandLogo({ width = 140 }: BrandLogoProps) {
  return (
    <View style={[styles.wrap, { width }]}>
      <Image
        source={FoundFitLogo}
        style={styles.logo}
        contentFit="contain"
        alt="FoundFit logo"
        accessibilityLabel="FoundFit logo"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
})
