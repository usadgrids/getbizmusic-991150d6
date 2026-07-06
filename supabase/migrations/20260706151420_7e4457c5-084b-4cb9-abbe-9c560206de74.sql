
-- Enforce rotation seconds = f(ad_type) at the database level. Any INSERT
-- or UPDATE on public.ads will have duration_seconds normalized to the
-- plan value, regardless of what the caller sends. This is the legal
-- guarantee: rotation seconds ALWAYS follow the ad's type.
CREATE OR REPLACE FUNCTION public.enforce_ad_duration_seconds()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.duration_seconds := CASE NEW.ad_type
    WHEN 'slider_10' THEN 10
    WHEN 'image_5'   THEN 7
    ELSE NEW.duration_seconds
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ads_enforce_duration_seconds ON public.ads;
CREATE TRIGGER ads_enforce_duration_seconds
BEFORE INSERT OR UPDATE OF ad_type, duration_seconds ON public.ads
FOR EACH ROW
EXECUTE FUNCTION public.enforce_ad_duration_seconds();

-- Re-sync existing rows so the current state matches the enforced rule.
UPDATE public.ads SET ad_type = ad_type
WHERE (ad_type = 'image_5'   AND duration_seconds <> 7)
   OR (ad_type = 'slider_10' AND duration_seconds <> 10);
