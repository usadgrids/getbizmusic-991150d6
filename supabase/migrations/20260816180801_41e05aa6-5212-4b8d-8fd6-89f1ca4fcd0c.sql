ALTER TABLE public.business_claims
  ADD COLUMN IF NOT EXISTS business_type text NOT NULL DEFAULT 'physical',
  ADD COLUMN IF NOT EXISTS address_is_private boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS service_area_label text;