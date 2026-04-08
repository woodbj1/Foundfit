CREATE TABLE IF NOT EXISTS public.meal_plan_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  stripe_payment_id TEXT UNIQUE,
  meal_plan_id UUID REFERENCES public.meal_plans(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS update_meal_plan_purchases_updated_at ON public.meal_plan_purchases;

CREATE TRIGGER update_meal_plan_purchases_updated_at
  BEFORE UPDATE ON public.meal_plan_purchases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.meal_plan_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Clients can view own meal plan purchases" ON public.meal_plan_purchases;
CREATE POLICY "Clients can view own meal plan purchases"
ON public.meal_plan_purchases
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all meal plan purchases" ON public.meal_plan_purchases;
CREATE POLICY "Admins can view all meal plan purchases"
ON public.meal_plan_purchases
FOR SELECT
TO authenticated
USING (private.is_admin());

CREATE INDEX IF NOT EXISTS idx_meal_plan_purchases_client_id
ON public.meal_plan_purchases(client_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_meal_plan_purchases_service_id
ON public.meal_plan_purchases(service_id);
