ALTER TABLE public.business_claims
  ADD COLUMN IF NOT EXISTS alliance_member boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alliance_membership_date timestamptz;