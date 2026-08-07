ALTER TABLE public.ads ADD COLUMN IF NOT EXISTS winwincast_synced_at TIMESTAMP WITH TIME ZONE;

-- Admins can view the sync timestamp; service role can update it during cross-project sync.
GRANT SELECT (winwincast_synced_at) ON public.ads TO authenticated;
GRANT UPDATE (winwincast_synced_at) ON public.ads TO service_role;
GRANT ALL ON public.ads TO service_role;