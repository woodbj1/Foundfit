'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type CarouselSlide = {
  id: string
  image_path: string
  alt_text: string
  eyebrow: string
  caption: string
  sort_order: number
  is_active: boolean
  public_url: string
}

type EditableSlide = CarouselSlide & {
  isSaving?: boolean
  isDeleting?: boolean
}

export default function CarouselManagement() {
  const [slides, setSlides] = useState<EditableSlide[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [altText, setAltText] = useState('')
  const [eyebrow, setEyebrow] = useState('')
  const [caption, setCaption] = useState('')

  async function loadSlides() {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/marketing/carousel', { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load carousel slides')
      }

      setSlides(data.slides || [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load carousel slides')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSlides()
  }, [])

  async function handleUpload(event: React.FormEvent) {
    event.preventDefault()

    if (!file) {
      toast.error('Choose an image to upload')
      return
    }

    if (!altText.trim() || !eyebrow.trim() || !caption.trim()) {
      toast.error('Alt text, eyebrow, and caption are required')
      return
    }

    const formData = new FormData()
    formData.append('image', file)
    formData.append('alt_text', altText.trim())
    formData.append('eyebrow', eyebrow.trim())
    formData.append('caption', caption.trim())

    setUploading(true)
    try {
      const response = await fetch('/api/admin/marketing/carousel', {
        method: 'POST',
        body: formData,
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload slide')
      }

      toast.success('Carousel image uploaded')
      setFile(null)
      setAltText('')
      setEyebrow('')
      setCaption('')
      await loadSlides()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not upload image')
    } finally {
      setUploading(false)
    }
  }

  async function saveSlide(slide: EditableSlide) {
    setSlides((current) =>
      current.map((currentSlide) =>
        currentSlide.id === slide.id ? { ...currentSlide, isSaving: true } : currentSlide
      )
    )

    try {
      const response = await fetch(`/api/admin/marketing/carousel/${slide.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alt_text: slide.alt_text,
          eyebrow: slide.eyebrow,
          caption: slide.caption,
          sort_order: slide.sort_order,
          is_active: slide.is_active,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save slide')
      }

      toast.success('Slide updated')
      await loadSlides()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save slide')
      setSlides((current) =>
        current.map((currentSlide) =>
          currentSlide.id === slide.id ? { ...currentSlide, isSaving: false } : currentSlide
        )
      )
    }
  }

  async function deleteSlide(id: string) {
    setSlides((current) =>
      current.map((slide) => (slide.id === id ? { ...slide, isDeleting: true } : slide))
    )

    try {
      const response = await fetch(`/api/admin/marketing/carousel/${id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete slide')
      }

      toast.success('Slide removed')
      await loadSlides()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove slide')
      setSlides((current) =>
        current.map((slide) => (slide.id === id ? { ...slide, isDeleting: false } : slide))
      )
    }
  }

  function updateSlide(id: string, updates: Partial<EditableSlide>) {
    setSlides((current) =>
      current.map((slide) => (slide.id === id ? { ...slide, ...updates } : slide))
    )
  }

  return (
    <Card className="border-none shadow-sm">
      <CardHeader>
        <CardTitle>Homepage Carousel</CardTitle>
        <CardDescription>
          Upload and manage the images shown at the top of the public landing page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleUpload} className="grid gap-4 rounded-xl border bg-muted/20 p-4 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carousel-image">Image</Label>
              <Input
                id="carousel-image"
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] || null)}
              />
              <p className="text-xs text-muted-foreground">
                Recommended: wide image, 16:9 or similar, under 8MB.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="carousel-alt">Alt text</Label>
              <Input
                id="carousel-alt"
                value={altText}
                onChange={(event) => setAltText(event.target.value)}
                placeholder="Describe the image for accessibility"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="carousel-eyebrow">Eyebrow label</Label>
              <Input
                id="carousel-eyebrow"
                value={eyebrow}
                onChange={(event) => setEyebrow(event.target.value)}
                placeholder="Personal Coaching"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carousel-caption">Caption</Label>
              <Textarea
                id="carousel-caption"
                value={caption}
                onChange={(event) => setCaption(event.target.value)}
                rows={4}
                placeholder="Short caption shown over the image"
              />
            </div>
            <Button type="submit" disabled={uploading} className="w-full sm:w-auto">
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
              Upload Slide
            </Button>
          </div>
        </form>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : slides.length > 0 ? (
          <div className="space-y-4">
            {slides.map((slide) => (
              <div
                key={slide.id}
                className="grid gap-4 rounded-xl border p-4 lg:grid-cols-[240px_minmax(0,1fr)]"
              >
                <div className="overflow-hidden rounded-xl border bg-muted/20">
                  <Image
                    src={slide.public_url}
                    alt={slide.alt_text}
                    width={640}
                    height={360}
                    className="h-40 w-full object-cover"
                  />
                </div>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Eyebrow</Label>
                      <Input
                        value={slide.eyebrow}
                        onChange={(event) => updateSlide(slide.id, { eyebrow: event.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Sort order</Label>
                      <Input
                        type="number"
                        value={slide.sort_order}
                        onChange={(event) =>
                          updateSlide(slide.id, {
                            sort_order: Number.parseInt(event.target.value || '0', 10) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Alt text</Label>
                    <Input
                      value={slide.alt_text}
                      onChange={(event) => updateSlide(slide.id, { alt_text: event.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Caption</Label>
                    <Textarea
                      value={slide.caption}
                      onChange={(event) => updateSlide(slide.id, { caption: event.target.value })}
                      rows={3}
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant={slide.is_active ? 'default' : 'outline'}
                      onClick={() => updateSlide(slide.id, { is_active: !slide.is_active })}
                    >
                      {slide.is_active ? 'Visible on homepage' : 'Hidden from homepage'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void saveSlide(slide)}
                      disabled={slide.isSaving || slide.isDeleting}
                    >
                      {slide.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => void deleteSlide(slide.id)}
                      disabled={slide.isSaving || slide.isDeleting}
                    >
                      {slide.isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
            No custom carousel slides yet. Upload your first image above and it will replace the default homepage set.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
