'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Loader2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type LogoVariant = 'header' | 'site' | 'email'

type LogoState = {
  variant: LogoVariant
  label: string
  description: string
  preview_background: 'light' | 'dark'
  image_path: string | null
  public_url: string
  is_custom: boolean
  default_src: string
}

type LogoResponse = {
  logos: LogoState[]
}

function getPreviewClasses(background: LogoState['preview_background']) {
  return background === 'dark' ? 'bg-[#160c20]' : 'bg-white'
}

function getHelperText(logo: LogoState) {
  return logo.is_custom
    ? `Custom ${logo.label.toLowerCase()} logo is live.`
    : `Using the default built-in ${logo.label.toLowerCase()} logo.`
}

export default function LogoManagement() {
  const [logos, setLogos] = useState<LogoState[]>([])
  const [files, setFiles] = useState<Record<LogoVariant, File | null>>({
    header: null,
    site: null,
    email: null,
  })
  const [loading, setLoading] = useState(true)
  const [uploadingVariant, setUploadingVariant] = useState<LogoVariant | null>(null)
  const [resettingVariant, setResettingVariant] = useState<LogoVariant | null>(null)

  async function loadLogos() {
    setLoading(true)

    try {
      const response = await fetch('/api/admin/marketing/logo', { cache: 'no-store' })
      const data = (await response.json()) as LogoResponse

      if (!response.ok) {
        throw new Error('Failed to load the current logo settings')
      }

      setLogos(data.logos || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load the current logo settings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLogos()
  }, [])

  function updateLogoState(nextLogo: LogoState) {
    setLogos((current) => current.map((logo) => (logo.variant === nextLogo.variant ? nextLogo : logo)))
  }

  function setVariantFile(variant: LogoVariant, file: File | null) {
    setFiles((current) => ({
      ...current,
      [variant]: file,
    }))
  }

  async function handleUpload(variant: LogoVariant, event: React.FormEvent) {
    event.preventDefault()

    const file = files[variant]
    if (!file) {
      toast.error('Choose a logo image to upload')
      return
    }

    const formData = new FormData()
    formData.append('variant', variant)
    formData.append('image', file)

    setUploadingVariant(variant)
    try {
      const response = await fetch('/api/admin/marketing/logo', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload the new logo')
      }

      setVariantFile(variant, null)
      updateLogoState(data.logo as LogoState)
      toast.success(`${(data.logo as LogoState).label} updated`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload the new logo')
    } finally {
      setUploadingVariant(null)
    }
  }

  async function handleReset(variant: LogoVariant) {
    setResettingVariant(variant)

    try {
      const response = await fetch(`/api/admin/marketing/logo?variant=${variant}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore the default logo')
      }

      setVariantFile(variant, null)
      updateLogoState(data.logo as LogoState)
      toast.success(`${(data.logo as LogoState).label} restored to default`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not restore the default logo')
    } finally {
      setResettingVariant(null)
    }
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle>Site Logos</CardTitle>
        <CardDescription>
          Manage separate logo treatments for the public header, stacked site layouts, and emails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          logos.map((logo) => (
            <div
              key={logo.variant}
              className="grid gap-6 rounded-2xl border bg-muted/10 p-5 lg:grid-cols-[280px_minmax(0,1fr)]"
            >
              <div className="rounded-xl border bg-white/60 p-5">
                <p className="text-sm font-medium text-foreground">{logo.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{logo.description}</p>
                <div
                  className={`mt-4 flex min-h-[200px] items-center justify-center rounded-xl border p-4 ${getPreviewClasses(logo.preview_background)}`}
                >
                  <Image
                    src={logo.public_url}
                    alt={`${logo.label} preview`}
                    width={1024}
                    height={logo.variant === 'header' ? 138 : 860}
                    unoptimized
                    className={
                      logo.variant === 'header'
                        ? 'max-h-24 w-auto object-contain'
                        : logo.variant === 'email'
                          ? 'max-h-40 w-auto object-contain'
                          : 'max-h-48 w-auto object-contain'
                    }
                  />
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{getHelperText(logo)}</p>
              </div>

              <form
                onSubmit={(event) => void handleUpload(logo.variant, event)}
                className="space-y-4 rounded-xl border bg-white/70 p-4"
              >
                <div className="space-y-2">
                  <Label htmlFor={`logo-image-${logo.variant}`}>New logo file</Label>
                  <Input
                    id={`logo-image-${logo.variant}`}
                    type="file"
                    accept="image/*"
                    onChange={(event) => setVariantFile(logo.variant, event.target.files?.[0] || null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Recommended: transparent PNG, wide crop for the header, stacked crop for site pages,
                    and high-contrast white artwork for email. Keep files under 6MB.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" disabled={uploadingVariant === logo.variant}>
                    {uploadingVariant === logo.variant ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="mr-2 h-4 w-4" />
                    )}
                    Upload Logo
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleReset(logo.variant)}
                    disabled={resettingVariant === logo.variant || !logo.is_custom}
                  >
                    {resettingVariant === logo.variant ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Restore Default
                  </Button>
                </div>
              </form>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  )
}
