-- ============================================================
-- Virtual Workout Studio: exercises, blocks, weekly plan, demo videos
-- ============================================================

-- ---- exercises ----
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  body_parts TEXT[] NOT NULL DEFAULT '{}',
  goals TEXT[] NOT NULL DEFAULT '{}',
  equipment TEXT[] NOT NULL DEFAULT '{}',
  summary TEXT,
  setup TEXT,
  how_to TEXT[] NOT NULL DEFAULT '{}',
  coaching_cues TEXT[] NOT NULL DEFAULT '{}',
  common_mistakes TEXT[] NOT NULL DEFAULT '{}',
  demo_video_url TEXT,              -- external link (Vimeo, YouTube, etc.)
  demo_video_storage_path TEXT,     -- native Supabase Storage path
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercises_slug ON public.exercises(slug);

DROP TRIGGER IF EXISTS exercises_updated_at ON public.exercises;
CREATE TRIGGER exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---- workout_blocks ----
CREATE TABLE IF NOT EXISTS public.workout_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  summary TEXT,
  body_part TEXT NOT NULL,
  goal TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 20,
  equipment TEXT[] NOT NULL DEFAULT '{}',
  level TEXT NOT NULL DEFAULT 'beginner' CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  trainer_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_blocks_slug ON public.workout_blocks(slug);

DROP TRIGGER IF EXISTS workout_blocks_updated_at ON public.workout_blocks;
CREATE TRIGGER workout_blocks_updated_at
  BEFORE UPDATE ON public.workout_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---- workout_block_exercises (join) ----
CREATE TABLE IF NOT EXISTS public.workout_block_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.workout_blocks(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  prescription TEXT NOT NULL,
  rest TEXT NOT NULL DEFAULT '45 sec',
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_wbe_block ON public.workout_block_exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_wbe_exercise ON public.workout_block_exercises(exercise_id);

-- ---- weekly_plan ----
CREATE TABLE IF NOT EXISTS public.weekly_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Current Plan',
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS weekly_plans_updated_at ON public.weekly_plans;
CREATE TRIGGER weekly_plans_updated_at
  BEFORE UPDATE ON public.weekly_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ---- weekly_plan_days ----
CREATE TABLE IF NOT EXISTS public.weekly_plan_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.weekly_plans(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  block_id UUID REFERENCES public.workout_blocks(id) ON DELETE SET NULL,
  label TEXT,
  UNIQUE(plan_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS idx_wpd_plan ON public.weekly_plan_days(plan_id);

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_block_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_plan_days ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read (clients use these for the workout studio)
CREATE POLICY "Authenticated users can view exercises"
  ON public.exercises FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view workout blocks"
  ON public.workout_blocks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view block exercises"
  ON public.workout_block_exercises FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view weekly plans"
  ON public.weekly_plans FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view weekly plan days"
  ON public.weekly_plan_days FOR SELECT TO authenticated USING (true);

-- Only admins can write
CREATE POLICY "Admins can manage exercises"
  ON public.exercises FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "Admins can manage workout blocks"
  ON public.workout_blocks FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "Admins can manage block exercises"
  ON public.workout_block_exercises FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "Admins can manage weekly plans"
  ON public.weekly_plans FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

CREATE POLICY "Admins can manage weekly plan days"
  ON public.weekly_plan_days FOR ALL TO authenticated
  USING (private.is_admin()) WITH CHECK (private.is_admin());

-- ============================================================
-- Supabase Storage bucket for demo videos
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('demo-videos', 'demo-videos', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view demo videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'demo-videos');

CREATE POLICY "Admins can upload demo videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'demo-videos' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete demo videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'demo-videos' AND (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin');
