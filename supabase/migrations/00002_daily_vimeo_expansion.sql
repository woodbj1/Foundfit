ALTER TABLE services
  ADD COLUMN IF NOT EXISTS fulfillment_type TEXT NOT NULL DEFAULT 'booking';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'services_fulfillment_type_check'
  ) THEN
    ALTER TABLE services
      ADD CONSTRAINT services_fulfillment_type_check
      CHECK (fulfillment_type IN ('booking', 'daily', 'vimeo', 'hybrid'));
  END IF;
END
$$;

ALTER TABLE services
  ADD COLUMN IF NOT EXISTS access_url TEXT;

ALTER TABLE bookings
  DROP CONSTRAINT IF EXISTS bookings_location_type_check;

ALTER TABLE bookings
  ADD CONSTRAINT bookings_location_type_check
  CHECK (location_type IN ('gym', 'travel', 'virtual'));

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS daily_room_name TEXT,
  ADD COLUMN IF NOT EXISTS daily_room_url TEXT;

UPDATE services
SET fulfillment_type = 'booking'
WHERE fulfillment_type IS NULL;

INSERT INTO services (
  name,
  title,
  description,
  category,
  type,
  price,
  session_count,
  session_limit,
  duration_minutes,
  max_weekly_bookings,
  is_popular,
  is_session,
  fulfillment_type,
  access_url,
  is_active
)
SELECT
  'Virtual Session',
  'Virtual Session',
  'One live personal training session delivered over Daily video.',
  'session',
  'single',
  7500,
  1,
  1,
  50,
  1,
  false,
  true,
  'daily',
  NULL,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE name = 'Virtual Session'
);

INSERT INTO services (
  name,
  title,
  description,
  category,
  type,
  price,
  session_count,
  session_limit,
  duration_minutes,
  max_weekly_bookings,
  is_popular,
  is_session,
  fulfillment_type,
  access_url,
  is_active
)
SELECT
  'On-Demand Video Library',
  'On-Demand Video Library',
  'Monthly Vimeo library access for workouts, mobility, and recovery sessions.',
  'subscription',
  'unlimited',
  2900,
  NULL,
  NULL,
  0,
  0,
  false,
  false,
  'vimeo',
  NULL,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM services WHERE name = 'On-Demand Video Library'
);
