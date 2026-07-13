ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS ministry_info jsonb;
ALTER TABLE public.ad_submissions ADD COLUMN IF NOT EXISTS ministry_info jsonb;