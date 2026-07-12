
CREATE TABLE public.design_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id text NOT NULL UNIQUE,
  customer_email text NOT NULL,
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  environment text NOT NULL,
  agreed_terms boolean NOT NULL DEFAULT false,
  agreed_no_refund boolean NOT NULL DEFAULT false,
  agreed_at timestamptz,
  disclosure_version text,
  ip_address text,
  intake jsonb,
  intake_submitted_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.design_orders TO authenticated;
GRANT ALL ON public.design_orders TO service_role;

ALTER TABLE public.design_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view design orders"
  ON public.design_orders FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update design orders"
  ON public.design_orders FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_design_orders_updated_at
  BEFORE UPDATE ON public.design_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_design_orders_status ON public.design_orders(status);
CREATE INDEX idx_design_orders_email ON public.design_orders(customer_email);
