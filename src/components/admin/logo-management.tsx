'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type SiteLogoState = {
  image_path: string | null
  public_url: string
  is_custom: boolean
}

export default function LogoManagement() {
  const [logo, setLogo] = useState<SiteLogoState | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [file, setFile] = useState<File | null>(null)

  async function loadLogo() {
    setLoading(true)

    try {
      const response = await fetch('/api/admin/marketing/logo', { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load the current site logo')
      }

      setLogo(data.logo)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the current site logo')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLogo()
  }, [])

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault()

    if (!file) {
      toast.error('Choose a logo image to upload')
      return
    }

    const formData = new FormData()
    formData.append('image', file)

    setUploading(true)
    try {
      const response = await fetch('/api/admin/marketing/logo', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload the new logo')
      }

      setFile(null)
      setLogo(data.logo)
      toast.success('Site logo updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload the new logo')
    } finally {
      setUploading(false)
    }
  }

  async function handleReset() {
    setResetting(true)

    try {
      const response = await fetch('/api/admin/marketing/logo', {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore the default logo')
      }

      setLogo(data.logo)
      setFile(null)
      toast.success('Default site logo restored')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not restore the default logo')
    } finally {
      setResetting(false)
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle>Site Logo</CardTitle>
        <CardDescription>
          Upload a new logo for the website header, footer, auth screens, and dashboards.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logo ? (
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="rounded-xl border bg-muted/10 p-6">
              <p className="mb-3 text-sm font-medium text-foreground">Current Logo Preview</p>
              <div className="flex min-h-[220px] items-center justify-center rounded-xl border bg-white p-4">
                <Image
                  src={logo.public_url}
                  alt="Current site logo"
                  width={1024}
                  height={860}
                  unoptimized
                  className="max-h-48 w-auto object-contain"
                />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {logo.is_custom ? 'Custom logo is live across the site.' : 'Using the default built-in logo.'}
              </p>
            </div>

            <form onSubmit={handleUpload} className="space-y-4 rounded-xl border bg-muted/20 p-4">
              <div className="space-y-2">
                <Label htmlFor="site-logo-image">New logo file</Label>
                <Input
                  id="site-logo-image"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setFile(event.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: transparent PNG or SVG-style export with generous padding, under 6MB.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="mr-2 h-4 w-4" />
                  )}
                  Upload Logo
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleReset()}
                  disabled={resetting || !logo.is_custom}
                >
                  {resetting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Restore Default
                </Button>
              </div>
            </form>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
