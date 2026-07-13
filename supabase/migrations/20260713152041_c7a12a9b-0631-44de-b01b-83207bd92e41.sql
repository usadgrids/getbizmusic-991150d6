
ALTER TABLE public.ad_payments
  ADD COLUMN IF NOT EXISTS payment_method text NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS owner_name text,
  ADD COLUMN IF NOT EXISTS business_name text,
  ADD COLUMN IF NOT EXISTS phone text;

ALTER TABLE public.ad_payments
  DROP CONSTRAINT IF EXISTS ad_payments_payment_method_check;

ALTER TABLE public.ad_payments
  ADD CONSTRAINT ad_payments_payment_method_check
  CHECK (payment_method IN ('stripe', 'zelle'));

CREATE INDEX IF NOT EXISTS ad_payments_method_status_idx
  ON public.ad_payments (payment_method, status);
