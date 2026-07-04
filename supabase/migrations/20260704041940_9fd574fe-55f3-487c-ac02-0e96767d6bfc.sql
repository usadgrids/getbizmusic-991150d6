
-- Add consent columns to ad_payments
ALTER TABLE public.ad_payments
  ADD COLUMN IF NOT EXISTS agreed_terms boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_no_refund boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreed_at timestamptz,
  ADD COLUMN IF NOT EXISTS disclosure_version text,
  ADD COLUMN IF NOT EXISTS ip_address text;

-- Dispute evidence table
CREATE TABLE IF NOT EXISTS public.dispute_evidence_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_id text NOT NULL UNIQUE,
  charge_id text,
  payment_intent_id text,
  stripe_session_id text,
  ad_payment_id uuid REFERENCES public.ad_payments(id) ON DELETE SET NULL,
  amount_cents integer,
  currency text,
  reason text,
  evidence_text text NOT NULL DEFAULT '',
  evidence_json jsonb,
  status text NOT NULL DEFAULT 'pending_review',
  environment text NOT NULL DEFAULT 'sandbox',
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dispute_evidence_log TO authenticated;
GRANT ALL ON public.dispute_evidence_log TO service_role;

ALTER TABLE public.dispute_evidence_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view dispute evidence"
  ON public.dispute_evidence_log FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admins can update dispute evidence"
  ON public.dispute_evidence_log FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_dispute_evidence_updated_at ON public.dispute_evidence_log;
CREATE TRIGGER update_dispute_evidence_updated_at
  BEFORE UPDATE ON public.dispute_evidence_log
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
