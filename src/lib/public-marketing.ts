import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import { createServiceRoleClient } from '@/lib/supabase/server'

export interface MarketingCarouselSlide {
  id?: string
  src: string
  alt: string
  eyebrow: string
  caption: string
}

type MarketingCarouselSlideRow = {
  id: string
  image_path: string
  alt_text: string
  eyebrow: string
  caption: string
  sort_order: number
  is_active: boolean
}

export const DEFAULT_MARKETING_CAROUSEL_SLIDES: MarketingCarouselSlide[] = [
  {
    src: 'https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/woodbury_035-pAt2U.jpg',
    alt: 'Personal trainer working with client in modern gym',
    eyebrow: 'Personal Coaching',
    caption: 'Focused one-on-one sessions built around your goals, schedule, and confidence.',
  },
  {
    src: 'https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/ceac7d79e2c2f23386ba9b92ab3824c7.jpg',
    alt: 'Fully equipped private training studio with squat rack and mirrors',
    eyebrow: 'Private Studio',
    caption: 'Train in a distraction-free space with professional equipment and room to move.',
  },
  {
    src: 'https://horizons-cdn.hostinger.com/5f5f3cbe-95f7-40cd-8ff1-013ae8dea373/28dc45b081d27f65ff7896ff9787ffbc.jpg',
    alt: 'Open workout floor with dumbbells and strength equipment',
    eyebrow: 'Strength First',
    caption: 'Build sustainable strength with progressive programming, not generic workouts.',
  },
]

function normalizeSlide(
  row: MarketingCarouselSlideRow,
  publicUrl: string
): MarketingCarouselSlide {
  return {
    id: row.id,
    src: publicUrl,
    alt: row.alt_text,
    eyebrow: row.eyebrow,
    caption: row.caption,
  }
}

export async function getPublicHeroSlides(): Promise<MarketingCarouselSlide[]> {
  try {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createServiceRoleClient()
      const { data, error } = await admin
        .from('marketing_carousel_slides')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      const slides = ((data ?? []) as MarketingCarouselSlideRow[])
        .map((row) => {
          const { data: urlData } = admin.storage
            .from('marketing-assets')
            .getPublicUrl(row.image_path)
          return normalizeSlide(row, urlData.publicUrl)
        })

      if (slides.length > 0) {
        return slides
      }
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
      const { data, error } = await supabase
        .from('marketing_carousel_slides')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })

      if (error) {
        throw error
      }

      const slides = ((data ?? []) as MarketingCarouselSlideRow[])
        .map((row) => {
          const { data: urlData } = supabase.storage
            .from('marketing-assets')
            .getPublicUrl(row.image_path)
          return normalizeSlide(row, urlData.publicUrl)
        })

      if (slides.length > 0) {
        return slides
      }
    }

    return DEFAULT_MARKETING_CAROUSEL_SLIDES
  } catch (error) {
    console.error('[getPublicHeroSlides]', error)
    return DEFAULT_MARKETING_CAROUSEL_SLIDES
  }
}

