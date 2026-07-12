CREATE OR REPLACE FUNCTION public.enforce_ad_duration_seconds()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Religious categories always get 12s (free ministry spot, novelty
  -- compensation for the Christian music playlist swap).
  IF NEW.industry IN ('church', 'religious_services', 'ministry') THEN
    NEW.duration_seconds := 12;
  ELSE
    NEW.duration_seconds := CASE NEW.ad_type
      WHEN 'slider_10' THEN 10
      WHEN 'image_5'   THEN 7
      ELSE NEW.duration_seconds
    END;
  END IF;
  RETURN NEW;
END;
$function$;