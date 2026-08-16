CREATE TABLE public.launch_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  is_active boolean not null default true,
  redemption_count integer not null default 0,
  redemption_limit integer not null default 1000,
  locked_price numeric not null default 49.95,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.launch_codes TO authenticated;
GRANT ALL ON public.launch_codes TO service_role;
ALTER TABLE public.launch_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view launch codes" ON public.launch_codes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_launch_codes_updated_at BEFORE UPDATE ON public.launch_codes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.launch_codes (code, is_active, redemption_count, redemption_limit, locked_price)
VALUES ('1000-FIRST', true, 0, 1000, 49.95);

ALTER TABLE public.business_claims
  ADD COLUMN launch_code_used text,
  ADD COLUMN founding_member boolean not null default false,
  ADD COLUMN priority boolean not null default false,
  ADD COLUMN locked_price numeric;

CREATE OR REPLACE FUNCTION public.redeem_launch_code(_code text)
RETURNS TABLE(applied boolean, locked_price numeric)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.launch_codes%ROWTYPE;
BEGIN
  UPDATE public.launch_codes lc
     SET redemption_count = lc.redemption_count + 1,
         is_active = CASE WHEN lc.redemption_count + 1 >= lc.redemption_limit THEN false ELSE lc.is_active END
   WHERE upper(lc.code) = upper(btrim(_code))
     AND lc.is_active = true
     AND lc.redemption_count < lc.redemption_limit
  RETURNING lc.* INTO r;

  IF r.id IS NULL THEN
    RETURN QUERY SELECT false, NULL::numeric;
  ELSE
    RETURN QUERY SELECT true, r.locked_price;
  END IF;
END;
$$;