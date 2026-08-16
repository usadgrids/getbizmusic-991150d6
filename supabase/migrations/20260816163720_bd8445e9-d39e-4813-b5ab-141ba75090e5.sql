ALTER TABLE public.business_claims
  ADD COLUMN IF NOT EXISTS design_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS design_asset_url text;