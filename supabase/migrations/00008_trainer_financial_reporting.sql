ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.trainers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS unit_amount_cents INTEGER;

ALTER TABLE public.session_packs
  ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.trainers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_paid_cents INTEGER;

ALTER TABLE public.meal_plan_purchases
  ADD COLUMN IF NOT EXISTS trainer_id UUID REFERENCES public.trainers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_paid_cents INTEGER;

UPDATE public.subscriptions AS subscription
SET unit_amount_cents = service.price
FROM public.services AS service
WHERE subscription.service_id = service.id
  AND subscription.unit_amount_cents IS NULL;

UPDATE public.session_packs AS pack
SET price_paid_cents = service.price
FROM public.services AS service
WHERE pack.service_id = service.id
  AND pack.price_paid_cents IS NULL;

UPDATE public.meal_plan_purchases AS purchase
SET price_paid_cents = service.price
FROM public.services AS service
WHERE purchase.service_id = service.id
  AND purchase.price_paid_cents IS NULL;

WITH client_single_trainer AS (
  SELECT
    booking.client_id,
    MIN(booking.trainer_id::text)::uuid AS trainer_id
  FROM public.bookings AS booking
  WHERE booking.trainer_id IS NOT NULL
  GROUP BY booking.client_id
  HAVING COUNT(DISTINCT booking.trainer_id) = 1
)
UPDATE public.subscriptions AS subscription
SET trainer_id = client_single_trainer.trainer_id
FROM client_single_trainer
WHERE subscription.client_id = client_single_trainer.client_id
  AND subscription.trainer_id IS NULL;

WITH client_single_trainer AS (
  SELECT
    booking.client_id,
    MIN(booking.trainer_id::text)::uuid AS trainer_id
  FROM public.bookings AS booking
  WHERE booking.trainer_id IS NOT NULL
  GROUP BY booking.client_id
  HAVING COUNT(DISTINCT booking.trainer_id) = 1
)
UPDATE public.session_packs AS pack
SET trainer_id = client_single_trainer.trainer_id
FROM client_single_trainer
WHERE pack.client_id = client_single_trainer.client_id
  AND pack.trainer_id IS NULL;

WITH client_single_trainer AS (
  SELECT
    booking.client_id,
    MIN(booking.trainer_id::text)::uuid AS trainer_id
  FROM public.bookings AS booking
  WHERE booking.trainer_id IS NOT NULL
  GROUP BY booking.client_id
  HAVING COUNT(DISTINCT booking.trainer_id) = 1
)
UPDATE public.meal_plan_purchases AS purchase
SET trainer_id = client_single_trainer.trainer_id
FROM client_single_trainer
WHERE purchase.client_id = client_single_trainer.client_id
  AND purchase.trainer_id IS NULL;

CREATE TABLE IF NOT EXISTS public.trainer_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES public.trainers(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_name TEXT NOT NULL,
  entry_type TEXT NOT NULL CHECK (
    entry_type IN (
      'single_session_purchase',
      'pack_purchase',
      'meal_plan_purchase',
      'subscription_charge'
    )
  ),
  source_reference TEXT NOT NULL,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(entry_type, source_reference)
);

ALTER TABLE public.trainer_earnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers can view own earnings" ON public.trainer_earnings;
CREATE POLICY "Trainers can view own earnings"
ON public.trainer_earnings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trainers AS trainer
    WHERE trainer.id = trainer_earnings.trainer_id
      AND trainer.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all earnings" ON public.trainer_earnings;
CREATE POLICY "Admins can view all earnings"
ON public.trainer_earnings
FOR SELECT
TO authenticated
USING (private.is_admin());

DROP POLICY IF EXISTS "Admins can manage all earnings" ON public.trainer_earnings;
CREATE POLICY "Admins can manage all earnings"
ON public.trainer_earnings
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Trainers can view own meal plan purchases" ON public.meal_plan_purchases;
CREATE POLICY "Trainers can view own meal plan purchases"
ON public.meal_plan_purchases
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.trainers AS trainer
    WHERE trainer.id = meal_plan_purchases.trainer_id
      AND trainer.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can view all meal plan purchases" ON public.meal_plan_purchases;
CREATE POLICY "Admins can view all meal plan purchases"
ON public.meal_plan_purchases
FOR SELECT
TO authenticated
USING (private.is_admin());

CREATE INDEX IF NOT EXISTS idx_subscriptions_trainer_id
ON public.subscriptions(trainer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_packs_trainer_id
ON public.session_packs(trainer_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_meal_plan_purchases_trainer_id
ON public.meal_plan_purchases(trainer_id, purchased_at DESC);

CREATE INDEX IF NOT EXISTS idx_trainer_earnings_trainer_month
ON public.trainer_earnings(trainer_id, occurred_at DESC);

INSERT INTO public.trainer_earnings (
  trainer_id,
  client_id,
  service_id,
  service_name,
  entry_type,
  source_reference,
  amount_cents,
  occurred_at
)
SELECT
  pack.trainer_id,
  pack.client_id,
  pack.service_id,
  COALESCE(service.name, 'Session Pack'),
  CASE
    WHEN service.type = 'single' THEN 'single_session_purchase'
    ELSE 'pack_purchase'
  END,
  COALESCE(pack.stripe_payment_id, 'pack-backfill-' || pack.id::text),
  COALESCE(pack.price_paid_cents, service.price, 0),
  pack.purchased_at
FROM public.session_packs AS pack
LEFT JOIN public.services AS service
  ON service.id = pack.service_id
WHERE pack.trainer_id IS NOT NULL
ON CONFLICT (entry_type, source_reference) DO NOTHING;

INSERT INTO public.trainer_earnings (
  trainer_id,
  client_id,
  service_id,
  service_name,
  entry_type,
  source_reference,
  amount_cents,
  occurred_at
)
SELECT
  purchase.trainer_id,
  purchase.client_id,
  purchase.service_id,
  COALESCE(service.name, 'Meal Plan'),
  'meal_plan_purchase',
  COALESCE(purchase.stripe_payment_id, 'meal-plan-backfill-' || purchase.id::text),
  COALESCE(purchase.price_paid_cents, service.price, 0),
  purchase.purchased_at
FROM public.meal_plan_purchases AS purchase
LEFT JOIN public.services AS service
  ON service.id = purchase.service_id
WHERE purchase.trainer_id IS NOT NULL
ON CONFLICT (entry_type, source_reference) DO NOTHING;

INSERT INTO public.trainer_earnings (
  trainer_id,
  client_id,
  service_id,
  service_name,
  entry_type,
  source_reference,
  amount_cents,
  occurred_at
)
SELECT
  subscription.trainer_id,
  subscription.client_id,
  subscription.service_id,
  COALESCE(service.name, 'Subscription'),
  'subscription_charge',
  COALESCE(subscription.stripe_subscription_id, 'subscription-backfill-' || subscription.id::text),
  COALESCE(subscription.unit_amount_cents, service.price, 0),
  COALESCE(subscription.current_period_start, subscription.created_at)
FROM public.subscriptions AS subscription
LEFT JOIN public.services AS service
  ON service.id = subscription.service_id
WHERE subscription.trainer_id IS NOT NULL
ON CONFLICT (entry_type, source_reference) DO NOTHING;
