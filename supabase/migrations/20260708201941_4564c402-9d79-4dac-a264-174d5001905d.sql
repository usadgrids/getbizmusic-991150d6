
CREATE TABLE public.ad_reps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  phone text,
  email text,
  code text NOT NULL UNIQUE,
  commission_percent numeric(5,2) NOT NULL DEFAULT 20,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_reps TO authenticated;
GRANT ALL ON public.ad_reps TO service_role;

ALTER TABLE public.ad_reps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage ad reps"
  ON public.ad_reps FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.ad_reps_normalize()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.code := upper(regexp_replace(coalesce(NEW.code,''), '\s+', '', 'g'));
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER ad_reps_normalize_trg
  BEFORE INSERT OR UPDATE ON public.ad_reps
  FOR EACH ROW EXECUTE FUNCTION public.ad_reps_normalize();

ALTER TABLE public.ad_payments
  ADD COLUMN rep_id uuid REFERENCES public.ad_reps(id) ON DELETE SET NULL,
  ADD COLUMN rep_code text,
  ADD COLUMN discount_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN commission_cents integer NOT NULL DEFAULT 0,
  ADD COLUMN commission_percent numeric(5,2);

CREATE INDEX ad_payments_rep_id_idx ON public.ad_payments(rep_id) WHERE rep_id IS NOT NULL;
