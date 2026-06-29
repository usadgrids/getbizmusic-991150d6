
CREATE TABLE public.ad_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  customer_email TEXT NOT NULL,
  plan TEXT NOT NULL CHECK (plan IN ('image_5','slider_10')),
  amount_cents INTEGER NOT NULL,
  submission_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  token_used BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'pending',
  environment TEXT NOT NULL DEFAULT 'sandbox',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX idx_ad_payments_token ON public.ad_payments(submission_token);
CREATE INDEX idx_ad_payments_session ON public.ad_payments(stripe_session_id);

GRANT ALL ON public.ad_payments TO service_role;
ALTER TABLE public.ad_payments ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies — all reads/writes go through server functions with service role.

ALTER TABLE public.ad_submissions ADD COLUMN payment_id UUID REFERENCES public.ad_payments(id) ON DELETE SET NULL;
