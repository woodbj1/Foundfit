import { useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'
import { Link } from 'expo-router'

import { BrandLogo } from '@/components/foundfit/brand-logo'
import { Field, PrimaryButton, SectionCard } from '@/components/foundfit/ui'
import { colors, spacing } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'

export default function SignupScreen() {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup() {
    try {
      setLoading(true)
      await signUp(fullName.trim(), email.trim(), password)
      Alert.alert(
        'Check your email',
        'We created your account. If email confirmation is enabled, confirm your email and then log in.'
      )
    } catch (error) {
      Alert.alert('Sign up failed', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.logoWrap}>
        <BrandLogo width={124} />
      </View>

      <SectionCard>
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Start booking, training, and moving with FoundFit.</Text>

        <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" />
        <Field
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          secureTextEntry
        />

        <PrimaryButton label="Create Account" onPress={handleSignup} loading={loading} />

        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Link href="/login" style={styles.link}>
            Log in
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
