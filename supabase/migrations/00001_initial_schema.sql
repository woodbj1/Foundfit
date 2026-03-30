-- ============================================
-- FoundFit Database Schema
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends auth.users)
-- ============================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  address TEXT,
  role TEXT NOT NULL DEFAULT 'client' CHECK (role IN ('client', 'trainer', 'admin')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- SERVICES
-- ============================================
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('unlimited', 'pack', 'single', 'meal_plan')),
  price INTEGER NOT NULL DEFAULT 0, -- in cents
  session_count INTEGER, -- null for unlimited
  duration_minutes INTEGER NOT NULL DEFAULT 50,
  max_weekly_bookings INTEGER NOT NULL DEFAULT 3,
  is_active BOOLEAN NOT NULL DEFAULT true,
  stripe_price_id TEXT, -- for Stripe integration
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Default services
INSERT INTO services (name, description, type, price, session_count, duration_minutes, max_weekly_bookings) VALUES
  ('Unlimited Monthly', 'Unlimited training sessions per month. Up to 3 sessions per week.', 'unlimited', 29900, NULL, 50, 3),
  ('Single Session', 'One personal training session.', 'single', 7500, 1, 50, 1),
  ('6-Pack', '6 personal training sessions. Use at your own pace.', 'pack', 39900, 6, 50, 3),
  ('12-Pack', '12 personal training sessions. Best value per session!', 'pack', 69900, 12, 50, 3),
  ('Monthly Meal Plan', 'Custom monthly meal plan tailored to your goals.', 'meal_plan', 9900, NULL, 0, 0);

-- ============================================
-- TRAINERS
-- ============================================
CREATE TABLE trainers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ============================================
-- AVAILABILITY BLOCKS
-- ============================================
CREATE TABLE availability_blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trainer_id UUID NOT NULL REFERENCES trainers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CHECK (end_time > start_time)
);

CREATE INDEX idx_availability_trainer ON availability_blocks(trainer_id);
CREATE INDEX idx_availability_day ON availability_blocks(day_of_week);

-- ============================================
-- SUBSCRIPTIONS
-- ============================================
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past_due', 'cancelled', 'expired')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_client ON subscriptions(client_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);

-- ============================================
-- SESSION PACKS
-- ============================================
CREATE TABLE session_packs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  total_sessions INTEGER NOT NULL,
  used_sessions INTEGER NOT NULL DEFAULT 0,
  stripe_payment_id TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

CREATE INDEX idx_session_packs_client ON session_packs(client_id);

-- ============================================
-- BOOKINGS
-- ============================================
CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES trainers(id),
  service_id UUID REFERENCES services(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'declined', 'cancelled', 'completed')),
  location_type TEXT NOT NULL DEFAULT 'gym' CHECK (location_type IN ('gym', 'travel')),
  travel_address TEXT,
  google_calendar_event_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE INDEX idx_bookings_client ON bookings(client_id);
CREATE INDEX idx_bookings_trainer ON bookings(trainer_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_start_time ON bookings(start_time);

-- ============================================
-- MEAL PLANS
-- ============================================
CREATE TABLE meal_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES profiles(id),
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_meal_plans_client ON meal_plans(client_id);

-- ============================================
-- APP SETTINGS
-- ============================================
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO settings (key, value) VALUES
  ('travel_fee', '2500'),
  ('default_duration', '50'),
  ('max_weekly_bookings', '3'),
  ('business_name', 'FoundFit'),
  ('business_address', 'Acworth, GA'),
  ('business_phone', ''),
  ('business_email', 'info@foundfit.net');

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read own, admins can read all
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);
CREATE POLICY "Admins can update all profiles" ON profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Services: everyone can read active, admins can manage
CREATE POLICY "Anyone can view active services" ON services FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can view all services" ON services FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Admins can manage services" ON services FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Trainers: public read for active, admin manage
CREATE POLICY "Anyone can view active trainers" ON trainers FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage trainers" ON trainers FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Availability: public read, trainers manage own, admin manage all
CREATE POLICY "Anyone can view availability" ON availability_blocks FOR SELECT USING (true);
CREATE POLICY "Trainers can manage own availability" ON availability_blocks FOR ALL USING (
  EXISTS (SELECT 1 FROM trainers WHERE id = availability_blocks.trainer_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage all availability" ON availability_blocks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Subscriptions: clients see own, admin/trainer see all
CREATE POLICY "Clients can view own subscriptions" ON subscriptions FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Staff can view all subscriptions" ON subscriptions FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);
CREATE POLICY "Admins can manage subscriptions" ON subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Session packs: clients see own, admin/trainer see all
CREATE POLICY "Clients can view own packs" ON session_packs FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Staff can view all packs" ON session_packs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);
CREATE POLICY "Admins can manage packs" ON session_packs FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Bookings: clients see own, trainers see assigned, admin sees all
CREATE POLICY "Clients can view own bookings" ON bookings FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Clients can create bookings" ON bookings FOR INSERT WITH CHECK (client_id = auth.uid());
CREATE POLICY "Clients can cancel own bookings" ON bookings FOR UPDATE USING (
  client_id = auth.uid() AND status IN ('pending', 'approved')
);
CREATE POLICY "Trainers can view assigned bookings" ON bookings FOR SELECT USING (
  EXISTS (SELECT 1 FROM trainers WHERE id = bookings.trainer_id AND user_id = auth.uid())
);
CREATE POLICY "Trainers can update assigned bookings" ON bookings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM trainers WHERE id = bookings.trainer_id AND user_id = auth.uid())
);
CREATE POLICY "Admins can manage all bookings" ON bookings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Meal plans: clients see own, trainers manage
CREATE POLICY "Clients can view own meal plans" ON meal_plans FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Trainers can manage meal plans" ON meal_plans FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'trainer'))
);

-- Settings: everyone can read, admins can update
CREATE POLICY "Anyone can read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Admins can manage settings" ON settings FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
