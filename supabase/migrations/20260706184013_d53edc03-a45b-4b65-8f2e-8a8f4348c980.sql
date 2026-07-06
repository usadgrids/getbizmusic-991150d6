
-- 1. cities table
CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  state text NOT NULL,
  lat numeric,
  lng numeric,
  timezone text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 100,
  hero_tagline text,
  hero_background_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cities_active_idx ON public.cities (is_active, sort_order, name);
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active cities" ON public.cities FOR SELECT USING (is_active = true OR public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage cities insert" ON public.cities FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage cities update" ON public.cities FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins manage cities delete" ON public.cities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER cities_updated_at BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. city_requests table
CREATE TABLE public.city_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city_name text NOT NULL,
  state text,
  email text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.city_requests TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.city_requests TO authenticated;
GRANT ALL ON public.city_requests TO service_role;
ALTER TABLE public.city_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can submit city requests" ON public.city_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins view city requests" ON public.city_requests FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update city requests" ON public.city_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete city requests" ON public.city_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Seed cities
INSERT INTO public.cities (slug, name, state, sort_order) VALUES
  ('national-city', 'National City', 'CA', 1),
  ('bonita', 'Bonita', 'CA', 2),
  ('mira-mesa', 'Mira Mesa', 'CA', 3);

-- 4. Add city_id to existing tables
ALTER TABLE public.ads ADD COLUMN city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL;
ALTER TABLE public.ad_submissions ADD COLUMN city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL;
ALTER TABLE public.ad_payments ADD COLUMN city_id uuid REFERENCES public.cities(id) ON DELETE SET NULL;

-- 5. Backfill existing rows to National City
UPDATE public.ads SET city_id = (SELECT id FROM public.cities WHERE slug = 'national-city') WHERE city_id IS NULL;
UPDATE public.ad_submissions SET city_id = (SELECT id FROM public.cities WHERE slug = 'national-city') WHERE city_id IS NULL;
UPDATE public.ad_payments SET city_id = (SELECT id FROM public.cities WHERE slug = 'national-city') WHERE city_id IS NULL;

CREATE INDEX ads_city_id_idx ON public.ads (city_id);
CREATE INDEX ad_submissions_city_id_idx ON public.ad_submissions (city_id);
CREATE INDEX ad_payments_city_id_idx ON public.ad_payments (city_id);
