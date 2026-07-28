CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text,
  owner_name text,
  email text NOT NULL UNIQUE,
  industry text,
  industry_category text,
  city text,
  state text NOT NULL DEFAULT 'CA',
  founded_year integer,
  source text NOT NULL DEFAULT 'apollo',
  source_detail text,
  campaign_status text NOT NULL DEFAULT 'not_sent',
  brevo_contact_id bigint,
  last_event_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view leads" ON public.leads
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert leads" ON public.leads
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update leads" ON public.leads
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete leads" ON public.leads
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX leads_city_idx ON public.leads (city);
CREATE INDEX leads_industry_category_idx ON public.leads (industry_category);
CREATE INDEX leads_campaign_status_idx ON public.leads (campaign_status);
CREATE INDEX leads_founded_year_idx ON public.leads (founded_year);
CREATE INDEX leads_source_detail_idx ON public.leads (source_detail);

CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();