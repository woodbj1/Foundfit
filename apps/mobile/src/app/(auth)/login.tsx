import { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'

import { BrandLogo } from '@/components/foundfit/brand-logo'
import { PrimaryButton, Field, SectionCard } from '@/components/foundfit/ui'
import { colors, spacing } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    try {
      setLoading(true)
      await signIn(email.trim(), password)
    } catch (error) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.logoWrap}>
        <BrandLogo width={132} />
      </View>

      <SectionCard>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Log in to your FoundFit client app.</Text>

        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Your password"
          secureTextEntry
        />

        <PrimaryButton label="Log In" onPress={handleLogin} loading={loading} />

        <Text style={styles.footerText}>
          Need an account?{' '}
          <Link href="/signup" style={styles.link}>
            Sign up
          </Link>
        </Text>
      </SectionCard>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
  logoWrap: {
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    color: colors.textMuted,
    marginBottom: spacing.sm,
    lineHeight: 22,
  },
  footerText: {
    textAlign: 'center',
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  link: {
    color: colors.primaryDark,
    fontWeight: '700',
  },
})
