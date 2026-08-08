ALTER TABLE public.design_orders
  ADD COLUMN IF NOT EXISTS ad_payment_id uuid REFERENCES public.ad_payments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'standalone';

CREATE INDEX IF NOT EXISTS idx_design_orders_ad_payment_id ON public.design_orders(ad_payment_id);

ALTER TABLE public.ad_payments
  ADD COLUMN IF NOT EXISTS design_addon boolean NOT NULL DEFAULT false;