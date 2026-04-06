UPDATE public.services
SET is_active = false
WHERE name = 'Virtual Session'
  AND fulfillment_type = 'daily';

UPDATE public.services
SET is_active = false
WHERE name = 'On-Demand Video Library'
  AND fulfillment_type = 'vimeo'
  AND access_url IS NULL;
