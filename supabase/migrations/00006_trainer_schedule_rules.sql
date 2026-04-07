CREATE TABLE IF NOT EXISTS public.trainer_schedule_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('work_hours', 'blocked')),
  label TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (end_time > start_time)
);

DROP TRIGGER IF EXISTS trainer_schedule_rules_updated_at ON public.trainer_schedule_rules;

CREATE TRIGGER trainer_schedule_rules_updated_at
  BEFORE UPDATE ON public.trainer_schedule_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX IF NOT EXISTS idx_schedule_rules_trainer ON public.trainer_schedule_rules(trainer_id);
CREATE INDEX IF NOT EXISTS idx_schedule_rules_day ON public.trainer_schedule_rules(day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_rules_type ON public.trainer_schedule_rules(rule_type);

INSERT INTO public.trainer_schedule_rules (
  trainer_id,
  day_of_week,
  start_time,
  end_time,
  rule_type,
  label
)
SELECT
  availability_blocks.trainer_id,
  availability_blocks.day_of_week,
  availability_blocks.start_time,
  availability_blocks.end_time,
  'work_hours',
  NULL
FROM public.availability_blocks
WHERE NOT EXISTS (
  SELECT 1
  FROM public.trainer_schedule_rules
  WHERE trainer_schedule_rules.trainer_id = availability_blocks.trainer_id
    AND trainer_schedule_rules.day_of_week = availability_blocks.day_of_week
    AND trainer_schedule_rules.start_time = availability_blocks.start_time
    AND trainer_schedule_rules.end_time = availability_blocks.end_time
    AND trainer_schedule_rules.rule_type = 'work_hours'
);

ALTER TABLE public.trainer_schedule_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view trainer schedule rules" ON public.trainer_schedule_rules;
DROP POLICY IF EXISTS "Trainers can manage own trainer schedule rules" ON public.trainer_schedule_rules;
DROP POLICY IF EXISTS "Admins can manage all trainer schedule rules" ON public.trainer_schedule_rules;

CREATE POLICY "Anyone can view trainer schedule rules"
ON public.trainer_schedule_rules
FOR SELECT
USING (true);

CREATE POLICY "Trainers can manage own trainer schedule rules"
ON public.trainer_schedule_rules
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trainers
    WHERE id = trainer_schedule_rules.trainer_id
      AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trainers
    WHERE id = trainer_schedule_rules.trainer_id
      AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all trainer schedule rules"
ON public.trainer_schedule_rules
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());
