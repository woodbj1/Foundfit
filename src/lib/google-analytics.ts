import 'server-only'

import { google } from 'googleapis'

export type GoogleAnalyticsSnapshot = {
  configured: boolean
  sessions: number
  totalUsers: number
  newUsers: number
  pageViews: number
  averageSessionDurationSeconds: number
  topPages: Array<{
    title: string
    pageViews: number
  }>
  error?: string | null
}

const ANALYTICS_SCOPES = ['https://www.googleapis.com/auth/analytics.readonly']

function hasConfiguredValue(value: string | undefined) {
  return Boolean(value && value.trim() && value.trim().toLowerCase() !== 'placeholder')
}

function getAnalyticsCredentials() {
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID
  const clientEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY

  if (
    !hasConfiguredValue(propertyId) ||
    !hasConfiguredValue(clientEmail) ||
    !hasConfiguredValue(privateKey)
  ) {
    return null
  }

  return {
    propertyId: propertyId!.trim(),
    clientEmail: clientEmail!.trim(),
    privateKey: privateKey!.replace(/\\n/g, '\n').trim(),
  }
}

function toMetricNumber(value?: string | null) {
  if (!value) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getGoogleAnalyticsSnapshot(): Promise<GoogleAnalyticsSnapshot> {
  const credentials = getAnalyticsCredentials()

  if (!credentials) {
    return {
      configured: false,
      sessions: 0,
      totalUsers: 0,
      newUsers: 0,
      pageViews: 0,
      averageSessionDurationSeconds: 0,
      topPages: [],
      error: 'Google Analytics is not configured yet.',
    }
  }

  try {
    const auth = new google.auth.JWT({
      email: credentials.clientEmail,
      key: credentials.privateKey,
      scopes: ANALYTICS_SCOPES,
    })

    const analyticsData = google.analyticsdata({
      version: 'v1beta',
      auth,
    })

    const property = `properties/${credentials.propertyId}`

    const [summaryResponse, pagesResponse] = await Promise.all([
      analyticsData.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          metrics: [
            { name: 'sessions' },
            { name: 'totalUsers' },
            { name: 'newUsers' },
            { name: 'screenPageViews' },
            { name: 'averageSessionDuration' },
          ],
        },
      }),
      analyticsData.properties.runReport({
        property,
        requestBody: {
          dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
          dimensions: [{ name: 'pageTitle' }],
          metrics: [{ name: 'screenPageViews' }],
          orderBys: [
            {
              metric: { metricName: 'screenPageViews' },
              desc: true,
            },
          ],
          limit: '5',
        },
      }),
    ])

    const summaryValues = summaryResponse.data.rows?.[0]?.metricValues ?? []
    const topPages = (pagesResponse.data.rows ?? [])
      .map((row) => ({
        title: row.dimensionValues?.[0]?.value || 'Untitled page',
        pageViews: toMetricNumber(row.metricValues?.[0]?.value),
      }))
      .filter((row) => row.pageViews > 0)

    return {
      configured: true,
      sessions: toMetricNumber(summaryValues[0]?.value),
      totalUsers: toMetricNumber(summaryValues[1]?.value),
      newUsers: toMetricNumber(summaryValues[2]?.value),
      pageViews: toMetricNumber(summaryValues[3]?.value),
      averageSessionDurationSeconds: toMetricNumber(summaryValues[4]?.value),
      topPages,
      error: null,
    }
  } catch (error) {
    console.error('Failed to load Google Analytics snapshot:', error)

    return {
      configured: true,
      sessions: 0,
      totalUsers: 0,
      newUsers: 0,
      pageViews: 0,
      averageSessionDurationSeconds: 0,
      topPages: [],
      error: error instanceof Error ? error.message : 'Could not load Google Analytics data.',
    }
  }
}

