-- FoundFit first-admin bootstrap
-- Replace the email below, then run in Supabase SQL Editor.

UPDATE public.profiles
SET role = 'admin'
WHERE email = 'replace-with-your-email@example.com';

-- Optional: confirm the change
SELECT id, email, full_name, role
FROM public.profiles
WHERE email = 'replace-with-your-email@example.com';
