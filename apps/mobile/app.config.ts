import type { ConfigContext, ExpoConfig } from 'expo/config'

const packageJson = require('./package.json')

type AppVariant = 'development' | 'preview' | 'production'

const appVariant = (process.env.APP_VARIANT as AppVariant | undefined) ?? 'production'
const isDevelopment = appVariant === 'development'
const isPreview = appVariant === 'preview'

const displayName = isDevelopment
  ? 'FoundFit Dev'
  : isPreview
    ? 'FoundFit Preview'
    : 'FoundFit'

const scheme = isDevelopment ? 'foundfit-dev' : isPreview ? 'foundfit-preview' : 'foundfit'
const bundleIdentifier = isDevelopment
  ? 'net.foundfit.app.dev'
  : isPreview
    ? 'net.foundfit.app.preview'
    : 'net.foundfit.app'
const androidPackage = isDevelopment
  ? 'net.foundfit.app.dev'
  : isPreview
    ? 'net.foundfit.app.preview'
    : 'net.foundfit.app'

export default ({ config }: ConfigContext): ExpoConfig => {
  const plugins: NonNullable<ExpoConfig['plugins']> = [
    'expo-router',

    [
      'expo-splash-screen',
      {
        backgroundColor: '#fbf6fd',
        android: {
          image: './assets/images/brand/foundfit-app-icon.png',
          imageWidth: 124,
        },
      },
    ],
    [
      'expo-calendar',
      {
        calendarPermission:
          'Allow FoundFit to add approved training sessions to your calendar when you request it.',
        remindersPermission: false,
      },
    ],

    // Fix iOS 26 TurboModule crash (facebook/react-native#54859)
    // Disables Dead Code Stripping when building RN from source
    './plugins/with-turbomodule-crash-fix',
  ]

  return {
    ...config,
    name: displayName,
    slug: 'foundfit-mobile',
    version: packageJson.version,
    orientation: 'portrait',
    icon: './assets/images/brand/foundfit-app-icon.png',
    scheme,
    userInterfaceStyle: 'automatic',
    updates: {
      enabled: false,
      checkAutomatically: 'NEVER',
    },
    ios: {
      bundleIdentifier,
      buildNumber: '1',
      icon: './assets/images/brand/foundfit-app-icon.png',
      supportsTablet: false,
      config: {
        usesNonExemptEncryption: false,
      },
    },
    android: {
      package: androidPackage,
      versionCode: 1,
      adaptiveIcon: {
        backgroundColor: '#fbf6fd',
        foregroundImage: './assets/images/brand/foundfit-app-icon.png',
        monochromeImage: './assets/images/brand/foundfit-app-icon.png',
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins,
    experiments: {
      typedRoutes: true,
    },
    extra: {
      appVariant,
      eas: {
        projectId: '70e41035-a46b-413f-b8b0-c9ae3f4d8432',
      },
    },
  }
}
