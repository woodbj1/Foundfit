import { Image, StyleSheet, View } from 'react-native'

import FoundFitLogo from '../../../assets/images/brand/foundfit-app-icon.png'

type BrandLogoProps = {
  width?: number
}

export function BrandLogo({ width = 140 }: BrandLogoProps) {
  return (
    <View style={[styles.wrap, { width }]}>
      <Image
        source={FoundFitLogo}
        style={styles.logo}
        resizeMode="contain"
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
