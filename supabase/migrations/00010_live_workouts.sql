-- Live workouts: trainer-scheduled group sessions all members can join
CREATE TABLE IF NOT EXISTS public.live_workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Daily Live Workout',
  description TEXT,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL DEFAULT '09:00',
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  daily_room_name TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Only one live workout per date
CREATE UNIQUE INDEX IF NOT EXISTS idx_live_workouts_date
ON public.live_workouts(scheduled_date) WHERE status != 'cancelled';

CREATE INDEX IF NOT EXISTS idx_live_workouts_status_date
ON public.live_workouts(status, scheduled_date);

DROP TRIGGER IF EXISTS live_workouts_updated_at ON public.live_workouts;
CREATE TRIGGER live_workouts_updated_at
  BEFORE UPDATE ON public.live_workouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.live_workouts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view live workouts
DROP POLICY IF EXISTS "Authenticated users can view live workouts" ON public.live_workouts;
CREATE POLICY "Authenticated users can view live workouts"
ON public.live_workouts
FOR SELECT
TO authenticated
USING (true);

-- Trainers and admins can manage live workouts
DROP POLICY IF EXISTS "Trainers can manage live workouts" ON public.live_workouts;
CREATE POLICY "Trainers can manage live workouts"
ON public.live_workouts
FOR ALL
TO authenticated
USING (private.is_trainer() OR private.is_admin())
WITH CHECK (private.is_trainer() OR private.is_admin());
