
ALTER TABLE public.ad_submissions
  ADD COLUMN IF NOT EXISTS requested_city_name text,
  ADD COLUMN IF NOT EXISTS requested_state_code text;
