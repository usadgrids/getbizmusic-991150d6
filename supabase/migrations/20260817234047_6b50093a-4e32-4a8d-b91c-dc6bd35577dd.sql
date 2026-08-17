CREATE TABLE public.kg_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  website text,
  google_place_id text,
  lat numeric,
  lng numeric,
  rating numeric,
  review_count integer NOT NULL DEFAULT 0,
  photo_count integer NOT NULL DEFAULT 0,
  localbusiness_jsonld jsonb,
  faq_jsonld jsonb,
  schema_valid boolean NOT NULL DEFAULT false,
  schema_notes text,
  needs_manual_validation boolean NOT NULL DEFAULT true,
  score integer,
  grade text,
  score_completeness numeric NOT NULL DEFAULT 0,
  score_schema numeric NOT NULL DEFAULT 0,
  score_answerability numeric NOT NULL DEFAULT 0,
  score_reviews numeric NOT NULL DEFAULT 0,
  weakest_component text,
  weakest_summary text,
  status text NOT NULL DEFAULT 'draft',
  last_scanned_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.business_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL UNIQUE REFERENCES public.kg_businesses(id) ON DELETE CASCADE,
  hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  services text[] NOT NULL DEFAULT '{}',
  service_area text,
  pricing_signals text,
  review_sentiment text,
  differentiators text[] NOT NULL DEFAULT '{}',
  summary text,
  raw_places jsonb,
  source_urls text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.qa_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.kg_businesses(id) ON DELETE CASCADE,
  question text NOT NULL,
  answer text,
  answered boolean NOT NULL DEFAULT false,
  flag text NOT NULL DEFAULT 'ok',
  missing_data text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX kg_businesses_status_idx ON public.kg_businesses(status);
CREATE INDEX qa_pairs_business_idx ON public.qa_pairs(business_id, sort_order);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kg_businesses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_facts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.qa_pairs TO authenticated;
GRANT SELECT ON public.kg_businesses TO anon;
GRANT SELECT ON public.business_facts TO anon;
GRANT SELECT ON public.qa_pairs TO anon;
GRANT ALL ON public.kg_businesses TO service_role;
GRANT ALL ON public.business_facts TO service_role;
GRANT ALL ON public.qa_pairs TO service_role;

ALTER TABLE public.kg_businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qa_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage kg businesses" ON public.kg_businesses
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read published kg businesses" ON public.kg_businesses
  FOR SELECT TO anon, authenticated
  USING (status = 'published');

CREATE POLICY "Admins manage business facts" ON public.business_facts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read facts of published businesses" ON public.business_facts
  FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.kg_businesses b WHERE b.id = business_facts.business_id AND b.status = 'published'));

CREATE POLICY "Admins manage qa pairs" ON public.qa_pairs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can read qa of published businesses" ON public.qa_pairs
  FOR SELECT TO anon, authenticated
  USING (answered = true AND EXISTS (SELECT 1 FROM public.kg_businesses b WHERE b.id = qa_pairs.business_id AND b.status = 'published'));

CREATE TRIGGER kg_businesses_updated_at BEFORE UPDATE ON public.kg_businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER business_facts_updated_at BEFORE UPDATE ON public.business_facts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER qa_pairs_updated_at BEFORE UPDATE ON public.qa_pairs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();