CREATE TABLE public.business_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  business_category text,
  address text,
  website text,
  phone text,
  google_place_id text,
  owner_name text NOT NULL,
  owner_email text NOT NULL,
  owner_phone text,
  wants_ai_audit boolean NOT NULL DEFAULT false,
  wants_ad_design boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'new',
  source_category_page text,
  notes text,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT INSERT ON public.business_claims TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_claims TO authenticated;
GRANT ALL ON public.business_claims TO service_role;

ALTER TABLE public.business_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a business claim"
  ON public.business_claims FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Admins can view business claims"
  ON public.business_claims FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update business claims"
  ON public.business_claims FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete business claims"
  ON public.business_claims FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER business_claims_set_updated_at
  BEFORE UPDATE ON public.business_claims
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();