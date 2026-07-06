ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS youtube_url text;
ALTER TABLE public.ad_submissions ADD COLUMN IF NOT EXISTS youtube_url text;