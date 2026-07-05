
-- Sequential ad numbering starting at 2911
CREATE SEQUENCE IF NOT EXISTS public.ads_ad_number_seq START WITH 2911;

ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS ad_number BIGINT UNIQUE;

-- Backfill: slider ads first (by created_at asc), then remaining ads
WITH ordered AS (
  SELECT id,
         ROW_NUMBER() OVER (
           ORDER BY CASE WHEN ad_type = 'slider_10' THEN 0 ELSE 1 END,
                    created_at ASC,
                    id ASC
         ) AS rn
  FROM public.ads
  WHERE ad_number IS NULL
)
UPDATE public.ads a
SET ad_number = 2910 + o.rn
FROM ordered o
WHERE a.id = o.id;

-- Advance sequence past any backfilled values
SELECT setval(
  'public.ads_ad_number_seq',
  GREATEST(2911, COALESCE((SELECT MAX(ad_number) FROM public.ads), 2910) + 1),
  false
);

-- Default for new ads
ALTER TABLE public.ads
  ALTER COLUMN ad_number SET DEFAULT nextval('public.ads_ad_number_seq');

ALTER SEQUENCE public.ads_ad_number_seq OWNED BY public.ads.ad_number;

ALTER TABLE public.ads
  ALTER COLUMN ad_number SET NOT NULL;
