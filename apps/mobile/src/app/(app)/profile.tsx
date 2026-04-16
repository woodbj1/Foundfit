import { useCallback, useEffect, useState } from 'react'
import { Alert, StyleSheet, Text, View } from 'react-native'

import { BrandLogo } from '@/components/foundfit/brand-logo'
import { Screen } from '@/components/foundfit/screen'
import {
  EmptyState,
  PrimaryButton,
  SectionCard,
  SectionTitle,
  SecondaryButton,
} from '@/components/foundfit/ui'
import { apiRequest } from '@/lib/api'
import { env } from '@/lib/env'
import { openExternalUrl } from '@/lib/external-url'
import { formatDateInTimeZone, formatPrice } from '@/lib/format'
import { colors } from '@/lib/theme'
import { useAuth } from '@/providers/auth-provider'
import type { MobileDashboardResponse } from '@/types/foundfit'

export default function ProfileScreen() {
  const { session, signOut } = useAuth()
  const [data, setData] = useState<MobileDashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    if (!session?.access_token) return

    try {
      setLoading(true)
      const response = await apiRequest<MobileDashboardResponse>('/api/mobile/dashboard', {
        accessToken: session.access_token,
      })
      setData(response)
    } catch (error) {
      Alert.alert('Could not load profile', error instanceof Error ? error.message : 'Please try again.')
    } finally {
      setLoading(false)
    }
  }, [session?.access_token])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  async function handleLogout() {
    try {
      await signOut()
    } catch (error) {
      Alert.alert('Could not log out', error instanceof Error ? error.message : 'Please try again.')
    }
  }

  return (
    <Screen title="Profile" subtitle="Your membership and account details.">
      {loading || !data ? (
        <SectionCard>
          <Text style={styles.loadingText}>Loading profile…</Text>
        </SectionCard>
      ) : (
        <>
          <SectionCard style={styles.identityCard}>
            <BrandLogo width={108} />
            <View style={{ gap: 4 }}>
              <Text style={styles.name}>{data.profile.full_name}</Text>
              <Text style={styles.meta}>{data.profile.email}</Text>
              {data.profile.phone ? <Text style={styles.meta}>{data.profile.phone}</Text> : null}
            </View>
          </SectionCard>

          <SectionCard>
            <SectionTitle title="Virtual Studio Membership" subtitle="Your subscription status." />

            {data.access.primarySubscription ? (
              <View style={styles.productCard}>
                <Text style={styles.productTitle}>{data.access.primarySubscription.serviceName}</Text>
                <Text style={styles.meta}>
                  Renews {formatDateInTimeZone(data.access.primarySubscription.renewsAt)}
                </Text>
                {data.access.primarySubscription.unitAmountCents ? (
                  <Text style={styles.meta}>
                    {formatPrice(data.access.primarySubscription.unitAmountCents)}/month
                  </Text>
                ) : null}
              </View>
            ) : (
              <EmptyState
                title="No active membership"
                message="Subscribe to the Virtual Studio ($50/mo) to access live workouts, 1-on-1 virtual sessions, and the workout library."
              />
            )}
          </SectionCard>

          <SectionCard>
            <SectionTitle title="What's Included" subtitle="Your Virtual Studio membership gives you:" />
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>• Daily live group workouts with your trainer</Text>
              <Text style={styles.featureItem}>• 1-on-1 virtual sessions ($50/hour)</Text>
              <Text style={styles.featureItem}>• Full workout library with guided programs</Text>
              <Text style={styles.featureItem}>• Workout of the Day and custom builders</Text>
            </View>
          </SectionCard>

          <SectionCard>
            <SectionTitle title="Account" subtitle="Manage billing and account settings on the web." />
            <SecondaryButton label="Open FoundFit on the Web" onPress={() => openExternalUrl(env.appUrl)} />
          </SectionCard>

          <PrimaryButton label="Log Out" onPress={handleLogout} />
        </>
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  loadingText: {
    color: colors.textMuted,
  },
  identityCard: {
    alignItems: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  meta: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  productCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    padding: 16,
    gap: 4,
  },
  productTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  featureList: {
    gap: 8,
  },
  featureItem: {
    color: colors.textMuted,
    lineHeight: 22,
    fontSize: 15,
  },
})
