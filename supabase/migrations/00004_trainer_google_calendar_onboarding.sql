ALTER TABLE public.trainers
  ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_calendar_connected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS google_calendar_email TEXT,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS public.trainer_calendar_connections (
  trainer_id UUID PRIMARY KEY REFERENCES public.trainers(id) ON DELETE CASCADE,
  google_refresh_token TEXT NOT NULL,
  google_calendar_id TEXT NOT NULL DEFAULT 'primary',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trainer_calendar_connections_updated_at ON public.trainer_calendar_connections;
CREATE TRIGGER trainer_calendar_connections_updated_at
  BEFORE UPDATE ON public.trainer_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.trainer_calendar_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view trainer calendar connections" ON public.trainer_calendar_connections;
DROP POLICY IF EXISTS "Admins can manage trainer calendar connections" ON public.trainer_calendar_connections;

CREATE POLICY "Admins can view trainer calendar connections"
ON public.trainer_calendar_connections
FOR SELECT
TO authenticated
USING (private.is_admin());

CREATE POLICY "Admins can manage trainer calendar connections"
ON public.trainer_calendar_connections
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

CREATE INDEX IF NOT EXISTS idx_trainers_onboarding_completed_at
  ON public.trainers(onboarding_completed_at);
