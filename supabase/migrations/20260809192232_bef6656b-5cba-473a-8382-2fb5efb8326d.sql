CREATE TABLE public.activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  business_name text NOT NULL,
  industry text NOT NULL,
  tagline text,
  city_id uuid REFERENCES public.cities(id),
  website_url text,
  youtube_url text,
  image_path text NOT NULL,
  ad_type text NOT NULL DEFAULT 'slider_10',
  price_cents integer NOT NULL DEFAULT 4800,
  price_note text,
  contact_name text,
  business_address text,
  contact_email text,
  phone_voice text,
  phone_sms text,
  status text NOT NULL DEFAULT 'unused',
  viewed_at timestamptz,
  confirmed_correct boolean,
  correction_notes text,
  customer_business_name text,
  customer_business_address text,
  customer_email text,
  customer_phone_voice text,
  customer_phone_sms text,
  agreed_terms boolean NOT NULL DEFAULT false,
  agreed_at timestamptz,
  payment_method text,
  stripe_session_id text,
  memo_code text,
  paid_at timestamptz,
  submitted_at timestamptz,
  ad_id uuid REFERENCES public.ads(id) ON DELETE SET NULL,
  expires_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX activation_codes_code_key ON public.activation_codes (code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.activation_codes TO authenticated;
GRANT ALL ON public.activation_codes TO service_role;

ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage activation codes"
ON public.activation_codes FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.activation_codes_normalize()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.code := upper(regexp_replace(coalesce(NEW.code,''), '\s+', '', 'g'));
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER activation_codes_normalize_trg
BEFORE INSERT OR UPDATE ON public.activation_codes
FOR EACH ROW EXECUTE FUNCTION public.activation_codes_normalize();