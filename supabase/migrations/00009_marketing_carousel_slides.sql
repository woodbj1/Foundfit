INSERT INTO storage.buckets (id, name, public)
VALUES ('marketing-assets', 'marketing-assets', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

CREATE TABLE IF NOT EXISTS public.marketing_carousel_slides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_path TEXT NOT NULL UNIQUE,
  alt_text TEXT NOT NULL,
  eyebrow TEXT NOT NULL,
  caption TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS marketing_carousel_slides_updated_at ON public.marketing_carousel_slides;
CREATE TRIGGER marketing_carousel_slides_updated_at
  BEFORE UPDATE ON public.marketing_carousel_slides
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.marketing_carousel_slides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active marketing carousel slides" ON public.marketing_carousel_slides;
CREATE POLICY "Public can view active marketing carousel slides"
ON public.marketing_carousel_slides
FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Admins can manage marketing carousel slides" ON public.marketing_carousel_slides;
CREATE POLICY "Admins can manage marketing carousel slides"
ON public.marketing_carousel_slides
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

CREATE INDEX IF NOT EXISTS idx_marketing_carousel_slides_sort
ON public.marketing_carousel_slides(is_active, sort_order, created_at);
