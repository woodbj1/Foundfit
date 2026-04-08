'use client'

import Image from 'next/image'
import { startTransition, useEffect, useEffectEvent, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import { Button } from '@/components/ui/button'
import type { MarketingCarouselSlide } from '@/lib/public-marketing'
import { cn } from '@/lib/utils'

type HeroCarouselProps = {
  slides: MarketingCarouselSlide[]
}

export default function HeroCarousel({ slides }: HeroCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const goToSlide = (nextIndex: number) => {
    startTransition(() => {
      setActiveIndex((nextIndex + slides.length) % slides.length)
    })
  }

  const advanceSlide = useEffectEvent(() => {
    if (paused || slides.length <= 1) {
      return
    }

    startTransition(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length)
    })
  })

  useEffect(() => {
    if (paused || slides.length <= 1) {
      return
    }

    const interval = window.setInterval(() => {
      advanceSlide()
    }, 5000)

    return () => window.clearInterval(interval)
  }, [paused, slides.length])

  if (slides.length === 0) {
    return null
  }

  return (
    <div
      className="group relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl shadow-2xl ring-1 ring-black/5">
        {slides.map((slide, index) => (
          <div
            key={slide.src}
            className={cn(
              'absolute inset-0 transition-opacity duration-700 ease-out',
              index === activeIndex ? 'opacity-100' : 'pointer-events-none opacity-0'
            )}
            aria-hidden={index === activeIndex ? undefined : true}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              priority={index === 0}
              sizes="(max-width: 1024px) 100vw, 80rem"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
              <div className="inline-flex max-w-xl flex-col gap-2 rounded-2xl bg-white/12 px-4 py-3 text-left text-white backdrop-blur-md">
                <span className="text-xs font-semibold uppercase tracking-[0.24em] text-pink-100">
                  {slide.eyebrow}
                </span>
                <p className="text-sm sm:text-base text-white/95">{slide.caption}</p>
              </div>
            </div>
          </div>
        ))}

        {slides.length > 1 ? (
          <>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 text-slate-900 shadow-md backdrop-blur-sm transition-opacity hover:bg-white group-hover:opacity-100 sm:opacity-0"
              onClick={() => goToSlide(activeIndex - 1)}
              aria-label="Show previous image"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 text-slate-900 shadow-md backdrop-blur-sm transition-opacity hover:bg-white group-hover:opacity-100 sm:opacity-0"
              onClick={() => goToSlide(activeIndex + 1)}
              aria-label="Show next image"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 rounded-full bg-black/20 px-3 py-2 backdrop-blur-sm">
              {slides.map((slide, index) => (
                <button
                  key={`${slide.src}-dot`}
                  type="button"
                  onClick={() => goToSlide(index)}
                  aria-label={`Show slide ${index + 1}`}
                  aria-pressed={index === activeIndex}
                  className={cn(
                    'h-2.5 w-2.5 rounded-full transition-all',
                    index === activeIndex ? 'bg-white w-6' : 'bg-white/55 hover:bg-white/80'
                  )}
                />
              ))}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
