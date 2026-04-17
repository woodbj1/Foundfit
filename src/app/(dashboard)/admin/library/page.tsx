'use client'

import { useEffect, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Loader2,
  ExternalLink,
  Play,
  Users,
  Package,
  Save,
  Video,
  Eye,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

type LibraryService = {
  id: string
  name: string
  description: string | null
  price: number
  type: string
  is_active: boolean
  fulfillment_type: string
  access_url: string | null
  category: string | null
}

type LibraryData = {
  services: LibraryService[]
  subscriberCount: number
  packHolderCount: number
  fallbackUrl: string | null
}

export default function AdminLibraryPage() {
  const [data, setData] = useState<LibraryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const response = await fetch('/api/admin/library', { cache: 'no-store' })
      if (!response.ok) throw new Error('Failed to load library data')
      const result = (await response.json()) as LibraryData
      setData(result)

      const urlMap: Record<string, string> = {}
      for (const service of result.services) {
        urlMap[service.id] = service.access_url ?? ''
      }
      setUrls(urlMap)
    } catch {
      toast.error('Failed to load library configuration')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(serviceId: string) {
    setSaving(serviceId)
    try {
      const response = await fetch('/api/admin/library', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId, accessUrl: urls[serviceId] ?? '' }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to save')
      }

      toast.success('Library URL updated')
      await loadData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(null)
    }
  }

  async function handlePreview(url: string) {
    if (!url) return
    setPreviewUrl(url)
    setPreviewHtml(null)
    setPreviewLoading(true)

    try {
      const oembedUrl = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}&responsive=true&title=false&byline=false&portrait=false`
      const response = await fetch(oembedUrl)
      if (!response.ok) throw new Error('Could not load Vimeo preview')
      const result = await response.json()
      setPreviewHtml(result.html)
    } catch {
      setPreviewHtml(null)
      toast.error('Could not load Vimeo embed preview. Check the URL is a valid Vimeo link.')
    } finally {
      setPreviewLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Failed to load library data.
      </div>
    )
  }

  const hasServices = data.services.length > 0
  const activeServices = data.services.filter((s) => s.is_active)
  const effectiveUrl =
    data.services.find((s) => s.access_url)?.access_url ?? data.fallbackUrl

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Video Library</h1>
        <p className="mt-1 text-muted-foreground">
          Manage the on-demand video library powered by Vimeo.
        </p>
      </div>

      {/* Stats overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Library Services</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.services.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeServices.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Subscribers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.subscriberCount}</div>
            <p className="text-xs text-muted-foreground">
              with library access
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Session Packs</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.packHolderCount}</div>
            <p className="text-xs text-muted-foreground">
              packs with library access
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Current status */}
      {effectiveUrl ? (
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Play className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-800">Library is live</p>
              <p className="text-xs text-emerald-600 truncate">{effectiveUrl}</p>
            </div>
            <a href={effectiveUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </Button>
            </a>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="flex items-center gap-3 py-4">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">No library URL configured</p>
              <p className="text-xs text-amber-600">
                Set an access URL on a service below, or configure the{' '}
                <code className="rounded bg-amber-100 px-1 py-0.5 text-[11px]">VIMEO_LIBRARY_URL</code>{' '}
                environment variable.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Service configurations */}
      {hasServices ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Library Services</h2>
          {data.services.map((service) => (
            <Card key={service.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{service.name}</CardTitle>
                    <CardDescription>
                      {service.description || 'No description'}
                      <span className="ml-2">
                        •{' '}
                        ${(service.price / 100).toFixed(2)}/{service.type === 'unlimited' ? 'mo' : 'pack'}
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={service.is_active ? 'default' : 'secondary'}>
                      {service.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                    <Badge variant="outline">{service.fulfillment_type}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`url-${service.id}`}>Vimeo Library URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id={`url-${service.id}`}
                      placeholder="https://vimeo.com/showcase/..."
                      value={urls[service.id] ?? ''}
                      onChange={(e) =>
                        setUrls((prev) => ({ ...prev, [service.id]: e.target.value }))
                      }
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      disabled={!urls[service.id]}
                      onClick={() => handlePreview(urls[service.id])}
                      title="Preview embed"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      disabled={saving === service.id}
                      onClick={() => handleSave(service.id)}
                    >
                      {saving === service.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paste a Vimeo showcase URL (e.g. <code className="rounded bg-muted px-1 text-[11px]">https://vimeo.com/showcase/12345</code>). The showcase is embedded directly in the client&apos;s library page — no redirect to Vimeo.
                  </p>
                </div>

                {data.fallbackUrl && !service.access_url && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    Using fallback URL from environment: <code className="rounded bg-blue-100 px-1">{data.fallbackUrl}</code>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Library Services</CardTitle>
            <CardDescription>
              No services with Vimeo or Hybrid fulfillment type found. Create a service with
              fulfillment type &quot;vimeo&quot; or &quot;hybrid&quot; in the{' '}
              <a href="/admin/services" className="underline text-primary">
                Services
              </a>{' '}
              section to enable the video library.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Vimeo preview */}
      {previewUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vimeo Preview</CardTitle>
            <CardDescription>{previewUrl}</CardDescription>
          </CardHeader>
          <CardContent>
            {previewLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : previewHtml ? (
              <div
                className="rounded-lg overflow-hidden"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">
                  Could not load preview. The URL may not be a valid Vimeo link, or it may be private.
                </p>
                <a
                  href={previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-sm text-primary underline"
                >
                  Open in browser <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
