-- AEO/GEO restaurant knowledge base for /food directory.
-- One researched page per approved food-category advertiser.

CREATE TABLE public.food_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  city text,
  state text,
  zip text,
  address text,
  lat numeric,
  lng numeric,
  phone text,
  website text,
  cuisines text[] NOT NULL DEFAULT '{}',
  price_range text,
  hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text,
  summary text,
  rating numeric,
  review_count integer,
  image_url text,
  source_urls text[] NOT NULL DEFAULT '{}',
  last_crawled_at timestamp with time zone,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.food_places TO anon, authenticated;
GRANT ALL ON public.food_places TO service_role;
ALTER TABLE public.food_places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view published food places"
  ON public.food_places FOR SELECT
  TO anon, authenticated
  USING (status = 'published');

CREATE UNIQUE INDEX food_places_ad_id_idx ON public.food_places (ad_id);
CREATE UNIQUE INDEX food_places_slug_idx ON public.food_places (slug);
CREATE INDEX food_places_city_state_idx ON public.food_places (city, state);
CREATE INDEX food_places_status_idx ON public.food_places (status);

CREATE TRIGGER update_food_places_updated_at
  BEFORE UPDATE ON public.food_places
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FAQ pairs per place (for FAQPage schema + AI answer-engine citations).
CREATE TABLE public.food_place_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid NOT NULL REFERENCES public.food_places(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.food_place_faqs TO anon, authenticated;
GRANT ALL ON public.food_place_faqs TO service_role;
ALTER TABLE public.food_place_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view FAQs for published places"
  ON public.food_place_faqs FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.food_places p WHERE p.id = place_id AND p.status = 'published')
  );

CREATE INDEX food_place_faqs_place_idx ON public.food_place_faqs (place_id);

CREATE TRIGGER update_food_place_faqs_updated_at
  BEFORE UPDATE ON public.food_place_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Audit log of each research/crawl run (admin-only).
CREATE TABLE public.food_crawl_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid REFERENCES public.food_places(id) ON DELETE CASCADE,
  triggered_by text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  errors text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.food_crawl_runs TO service_role;
ALTER TABLE public.food_crawl_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX food_crawl_runs_place_idx ON public.food_crawl_runs (place_id);
CREATE INDEX food_crawl_runs_status_idx ON public.food_crawl_runs (status);