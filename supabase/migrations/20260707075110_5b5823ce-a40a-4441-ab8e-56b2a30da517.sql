
ALTER TABLE public.ads
  ADD COLUMN IF NOT EXISTS edit_token uuid NOT NULL DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS ads_edit_token_key ON public.ads(edit_token);

ALTER TABLE public.ad_submissions
  ADD COLUMN IF NOT EXISTS ad_id uuid REFERENCES public.ads(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ad_submissions_ad_id_idx ON public.ad_submissions(ad_id);
