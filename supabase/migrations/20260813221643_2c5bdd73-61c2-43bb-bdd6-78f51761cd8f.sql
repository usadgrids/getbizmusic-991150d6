ALTER TABLE public.food_places
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'food',
  ADD COLUMN IF NOT EXISTS booking_url text;

ALTER TABLE public.food_crawl_runs
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'food';

UPDATE public.food_places SET category = 'food' WHERE category IS NULL;

CREATE INDEX IF NOT EXISTS food_places_category_status_idx ON public.food_places (category, status);
CREATE UNIQUE INDEX IF NOT EXISTS food_places_category_slug_idx ON public.food_places (category, slug);