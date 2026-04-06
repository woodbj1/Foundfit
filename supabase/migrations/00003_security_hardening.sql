CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.current_app_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', 'client')
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT private.current_app_role() = 'admin'
$$;

CREATE OR REPLACE FUNCTION private.is_trainer()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT private.current_app_role() = 'trainer'
$$;

CREATE OR REPLACE FUNCTION private.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT private.current_app_role() IN ('admin', 'trainer')
$$;

CREATE OR REPLACE FUNCTION private.sync_profile_role_to_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

GRANT EXECUTE ON FUNCTION private.current_app_role() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_trainer() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_staff() TO authenticated;

REVOKE ALL ON FUNCTION private.sync_profile_role_to_auth_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS profiles_sync_role_to_auth_user ON public.profiles;
CREATE TRIGGER profiles_sync_role_to_auth_user
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION private.sync_profile_role_to_auth_user();

UPDATE auth.users AS users
SET raw_app_meta_data = COALESCE(users.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', profiles.role)
FROM public.profiles AS profiles
WHERE profiles.id = users.id
  AND COALESCE(users.raw_app_meta_data ->> 'role', '') IS DISTINCT FROM profiles.role;

UPDATE storage.buckets
SET public = false
WHERE id = 'meal-plans';

UPDATE public.meal_plans
SET file_url = split_part(
  regexp_replace(file_url, '^https?://[^/]+/storage/v1/object/(?:public|sign)/meal-plans/', ''),
  '?',
  1
)
WHERE file_url ~ '^https?://[^/]+/storage/v1/object/(?:public|sign)/meal-plans/';

DROP POLICY IF EXISTS "Public can read meal plan files" ON storage.objects;
DROP POLICY IF EXISTS "Trainers and admins can upload meal plan files" ON storage.objects;
DROP POLICY IF EXISTS "Trainers and admins can update meal plan files" ON storage.objects;
DROP POLICY IF EXISTS "Trainers and admins can delete meal plan files" ON storage.objects;

CREATE POLICY "Clients can read own meal plan files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meal-plans'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Trainers can read assigned meal plan files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'meal-plans'
  AND private.is_trainer()
  AND EXISTS (
    SELECT 1
    FROM public.trainers AS trainer
    WHERE trainer.user_id = auth.uid()
      AND (
        EXISTS (
          SELECT 1
          FROM public.bookings AS booking
          WHERE booking.trainer_id = trainer.id
            AND booking.client_id::text = (storage.foldername(name))[1]
        )
        OR EXISTS (
          SELECT 1
          FROM public.meal_plans AS meal_plan
          WHERE meal_plan.trainer_id = trainer.id
            AND meal_plan.client_id::text = (storage.foldername(name))[1]
        )
      )
  )
);

CREATE POLICY "Admins can manage all meal plan files"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'meal-plans'
  AND private.is_admin()
)
WITH CHECK (
  bucket_id = 'meal-plans'
  AND private.is_admin()
);

CREATE POLICY "Trainers can upload assigned meal plan files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'meal-plans'
  AND private.is_trainer()
  AND EXISTS (
    SELECT 1
    FROM public.trainers AS trainer
    WHERE trainer.user_id = auth.uid()
      AND (
        EXISTS (
          SELECT 1
          FROM public.bookings AS booking
          WHERE booking.trainer_id = trainer.id
            AND booking.client_id::text = (storage.foldername(name))[1]
        )
        OR EXISTS (
          SELECT 1
          FROM public.meal_plans AS meal_plan
          WHERE meal_plan.trainer_id = trainer.id
            AND meal_plan.client_id::text = (storage.foldername(name))[1]
        )
      )
  )
);

CREATE POLICY "Trainers can update assigned meal plan files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'meal-plans'
  AND private.is_trainer()
  AND EXISTS (
    SELECT 1
    FROM public.trainers AS trainer
    WHERE trainer.user_id = auth.uid()
      AND (
        EXISTS (
          SELECT 1
          FROM public.bookings AS booking
          WHERE booking.trainer_id = trainer.id
            AND booking.client_id::text = (storage.foldername(name))[1]
        )
        OR EXISTS (
          SELECT 1
          FROM public.meal_plans AS meal_plan
          WHERE meal_plan.trainer_id = trainer.id
            AND meal_plan.client_id::text = (storage.foldername(name))[1]
        )
      )
  )
)
WITH CHECK (
  bucket_id = 'meal-plans'
  AND private.is_trainer()
  AND EXISTS (
    SELECT 1
    FROM public.trainers AS trainer
    WHERE trainer.user_id = auth.uid()
      AND (
        EXISTS (
          SELECT 1
          FROM public.bookings AS booking
          WHERE booking.trainer_id = trainer.id
            AND booking.client_id::text = (storage.foldername(name))[1]
        )
        OR EXISTS (
          SELECT 1
          FROM public.meal_plans AS meal_plan
          WHERE meal_plan.trainer_id = trainer.id
            AND meal_plan.client_id::text = (storage.foldername(name))[1]
        )
      )
  )
);

CREATE POLICY "Trainers can delete assigned meal plan files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'meal-plans'
  AND private.is_trainer()
  AND EXISTS (
    SELECT 1
    FROM public.trainers AS trainer
    WHERE trainer.user_id = auth.uid()
      AND (
        EXISTS (
          SELECT 1
          FROM public.bookings AS booking
          WHERE booking.trainer_id = trainer.id
            AND booking.client_id::text = (storage.foldername(name))[1]
        )
        OR EXISTS (
          SELECT 1
          FROM public.meal_plans AS meal_plan
          WHERE meal_plan.trainer_id = trainer.id
            AND meal_plan.client_id::text = (storage.foldername(name))[1]
        )
      )
  )
);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND role = private.current_app_role()
);

CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (private.is_admin());

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

CREATE POLICY "Trainers can view assigned client profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  private.is_trainer()
  AND role = 'client'
  AND (
    EXISTS (
      SELECT 1
      FROM public.trainers AS trainer
      JOIN public.bookings AS booking
        ON booking.trainer_id = trainer.id
      WHERE trainer.user_id = auth.uid()
        AND booking.client_id = profiles.id
    )
    OR EXISTS (
      SELECT 1
      FROM public.trainers AS trainer
      JOIN public.meal_plans AS meal_plan
        ON meal_plan.trainer_id = trainer.id
      WHERE trainer.user_id = auth.uid()
        AND meal_plan.client_id = profiles.id
    )
  )
);

DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Admins can view all services" ON public.services;
DROP POLICY IF EXISTS "Admins can manage services" ON public.services;

CREATE POLICY "Anyone can view active services"
ON public.services
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can view all services"
ON public.services
FOR SELECT
TO authenticated
USING (private.is_admin());

CREATE POLICY "Admins can manage services"
ON public.services
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Anyone can view active trainers" ON public.trainers;
DROP POLICY IF EXISTS "Admins can manage trainers" ON public.trainers;

CREATE POLICY "Anyone can view active trainers"
ON public.trainers
FOR SELECT
USING (is_active = true);

CREATE POLICY "Trainers can view own trainer profile"
ON public.trainers
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage trainers"
ON public.trainers
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Anyone can view availability" ON public.availability_blocks;
DROP POLICY IF EXISTS "Trainers can manage own availability" ON public.availability_blocks;
DROP POLICY IF EXISTS "Admins can manage all availability" ON public.availability_blocks;

CREATE POLICY "Anyone can view availability"
ON public.availability_blocks
FOR SELECT
USING (true);

CREATE POLICY "Trainers can manage own availability"
ON public.availability_blocks
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trainers
    WHERE id = availability_blocks.trainer_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trainers
    WHERE id = availability_blocks.trainer_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all availability"
ON public.availability_blocks
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Clients can view own subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Staff can view all subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Admins can manage subscriptions" ON public.subscriptions;

CREATE POLICY "Clients can view own subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Trainers can view assigned client subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (
  private.is_trainer()
  AND EXISTS (
    SELECT 1
    FROM public.trainers AS trainer
    JOIN public.bookings AS booking
      ON booking.trainer_id = trainer.id
    WHERE trainer.user_id = auth.uid()
      AND booking.client_id = subscriptions.client_id
  )
);

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (private.is_admin());

CREATE POLICY "Admins can manage subscriptions"
ON public.subscriptions
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Clients can view own packs" ON public.session_packs;
DROP POLICY IF EXISTS "Staff can view all packs" ON public.session_packs;
DROP POLICY IF EXISTS "Admins can manage packs" ON public.session_packs;

CREATE POLICY "Clients can view own packs"
ON public.session_packs
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Trainers can view assigned client packs"
ON public.session_packs
FOR SELECT
TO authenticated
USING (
  private.is_trainer()
  AND EXISTS (
    SELECT 1
    FROM public.trainers AS trainer
    JOIN public.bookings AS booking
      ON booking.trainer_id = trainer.id
    WHERE trainer.user_id = auth.uid()
      AND booking.client_id = session_packs.client_id
  )
);

CREATE POLICY "Admins can view all packs"
ON public.session_packs
FOR SELECT
TO authenticated
USING (private.is_admin());

CREATE POLICY "Admins can manage packs"
ON public.session_packs
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Clients can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Clients can cancel own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Trainers can view assigned bookings" ON public.bookings;
DROP POLICY IF EXISTS "Trainers can update assigned bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;

CREATE POLICY "Clients can view own bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Clients can create bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can cancel own bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  client_id = auth.uid()
  AND status IN ('pending', 'approved')
)
WITH CHECK (client_id = auth.uid());

CREATE POLICY "Trainers can view assigned bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trainers
    WHERE id = bookings.trainer_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Trainers can update assigned bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trainers
    WHERE id = bookings.trainer_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trainers
    WHERE id = bookings.trainer_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Clients can view own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Trainers can manage own meal plans" ON public.meal_plans;
DROP POLICY IF EXISTS "Admins can manage all meal plans" ON public.meal_plans;

CREATE POLICY "Clients can view own meal plans"
ON public.meal_plans
FOR SELECT
TO authenticated
USING (client_id = auth.uid());

CREATE POLICY "Trainers can manage own meal plans"
ON public.meal_plans
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.trainers
    WHERE id = meal_plans.trainer_id AND user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.trainers
    WHERE id = meal_plans.trainer_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all meal plans"
ON public.meal_plans
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

DROP POLICY IF EXISTS "Anyone can read settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON public.settings;

CREATE POLICY "Anyone can read settings"
ON public.settings
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage settings"
ON public.settings
FOR ALL
TO authenticated
USING (private.is_admin())
WITH CHECK (private.is_admin());

CREATE INDEX IF NOT EXISTS idx_bookings_client_trainer ON public.bookings(client_id, trainer_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_client_trainer ON public.meal_plans(client_id, trainer_id);
CREATE INDEX IF NOT EXISTS idx_storage_objects_meal_plans_name ON storage.objects(bucket_id, name);
