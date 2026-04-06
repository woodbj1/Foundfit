begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

create or replace function pg_temp.set_auth_context(user_id uuid, app_role text)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', user_id::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object(
      'sub', user_id::text,
      'role', 'authenticated',
      'app_metadata', json_build_object('role', app_role)
    )::text,
    true
  );
end;
$$;

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
values
  (
    '10000000-0000-0000-0000-000000000001',
    'security-admin@foundfit.test',
    '{"role":"admin"}',
    '{"full_name":"Security Admin"}'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    'security-trainer@foundfit.test',
    '{"role":"trainer"}',
    '{"full_name":"Security Trainer"}'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'assigned-client@foundfit.test',
    '{"role":"client"}',
    '{"full_name":"Assigned Client"}'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    'other-client@foundfit.test',
    '{"role":"client"}',
    '{"full_name":"Other Client"}'
  )
on conflict (id) do nothing;

update public.profiles
set role = 'admin'
where id = '10000000-0000-0000-0000-000000000001';

update public.profiles
set role = 'trainer'
where id = '20000000-0000-0000-0000-000000000002';

insert into public.trainers (id, user_id, is_active)
values (
  '50000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000002',
  true
)
on conflict (user_id) do update
set is_active = excluded.is_active;

insert into public.bookings (
  client_id,
  trainer_id,
  service_id,
  start_time,
  end_time,
  status
)
values (
  '30000000-0000-0000-0000-000000000003',
  '50000000-0000-0000-0000-000000000005',
  (select id from public.services where type = 'single' order by created_at limit 1),
  now() + interval '1 day',
  now() + interval '1 day 50 minutes',
  'approved'
);

insert into public.subscriptions (
  client_id,
  service_id,
  stripe_subscription_id,
  status,
  current_period_start,
  current_period_end,
  auto_renew
)
values
  (
    '30000000-0000-0000-0000-000000000003',
    (select id from public.services where type = 'unlimited' order by created_at limit 1),
    'sub_assigned_client',
    'active',
    now(),
    now() + interval '30 days',
    true
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    (select id from public.services where type = 'unlimited' order by created_at limit 1),
    'sub_other_client',
    'active',
    now(),
    now() + interval '30 days',
    true
  );

insert into public.session_packs (
  client_id,
  service_id,
  total_sessions,
  used_sessions,
  stripe_payment_id
)
values
  (
    '30000000-0000-0000-0000-000000000003',
    (select id from public.services where type = 'pack' order by created_at limit 1),
    6,
    0,
    'pi_assigned_client'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    (select id from public.services where type = 'pack' order by created_at limit 1),
    6,
    0,
    'pi_other_client'
  );

insert into public.meal_plans (client_id, trainer_id, title, file_url)
values
  (
    '30000000-0000-0000-0000-000000000003',
    '50000000-0000-0000-0000-000000000005',
    'Assigned Meal Plan',
    '30000000-0000-0000-0000-000000000003/assigned-plan.pdf'
  ),
  (
    '40000000-0000-0000-0000-000000000004',
    '50000000-0000-0000-0000-000000000005',
    'Other Meal Plan',
    '40000000-0000-0000-0000-000000000004/other-plan.pdf'
  );

select is(
  (select public from storage.buckets where id = 'meal-plans'),
  false,
  'Meal plan bucket is private'
);

set local role authenticated;

select pg_temp.set_auth_context('30000000-0000-0000-0000-000000000003', 'client');

select results_eq(
  'select count(*) from public.profiles',
  array[1::bigint],
  'Client can only see their own profile'
);

select results_eq(
  'select count(*) from public.meal_plans',
  array[1::bigint],
  'Client can only see their own meal plans'
);

select results_eq(
  'select count(*) from public.subscriptions',
  array[1::bigint],
  'Client can only see their own subscriptions'
);

select pg_temp.set_auth_context('20000000-0000-0000-0000-000000000002', 'trainer');

select results_eq(
  $$select count(*) from public.profiles where id in (
      '30000000-0000-0000-0000-000000000003',
      '40000000-0000-0000-0000-000000000004'
    )$$,
  array[2::bigint],
  'Trainer can see client profiles for clients they book or write plans for'
);

select results_eq(
  'select count(*) from public.bookings',
  array[1::bigint],
  'Trainer can only see assigned bookings'
);

select results_eq(
  'select count(*) from public.meal_plans',
  array[2::bigint],
  'Trainer can see meal plans they created'
);

select results_eq(
  'select count(*) from public.subscriptions',
  array[1::bigint],
  'Trainer can only see subscriptions for assigned clients'
);

select results_eq(
  'select count(*) from public.session_packs',
  array[1::bigint],
  'Trainer can only see packs for assigned clients'
);

select pg_temp.set_auth_context('10000000-0000-0000-0000-000000000001', 'admin');

select results_eq(
  $$select count(*) from public.profiles where id in (
      '10000000-0000-0000-0000-000000000001',
      '20000000-0000-0000-0000-000000000002',
      '30000000-0000-0000-0000-000000000003',
      '40000000-0000-0000-0000-000000000004'
    )$$,
  array[4::bigint],
  'Admin can see every seeded profile'
);

select results_eq(
  'select count(*) from public.meal_plans',
  array[2::bigint],
  'Admin can see all meal plans'
);

select results_eq(
  'select count(*) from public.subscriptions',
  array[2::bigint],
  'Admin can see all subscriptions'
);

select * from finish();
rollback;
