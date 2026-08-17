ALTER TABLE public.ad_payments
  ADD COLUMN IF NOT EXISTS membership_start_date date,
  ADD COLUMN IF NOT EXISTS membership_due_date date,
  ADD COLUMN IF NOT EXISTS renewal_reminder_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS membership_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS bill_later_due_date timestamptz,
  ADD COLUMN IF NOT EXISTS payment_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS payment_verified_by text;

-- Backfill from existing history
UPDATE public.ad_payments
   SET membership_start_date = COALESCE(membership_start_date, (COALESCE(paid_at, created_at))::date),
       membership_due_date   = COALESCE(membership_due_date, ((COALESCE(paid_at, created_at))::date + INTERVAL '1 year')::date),
       payment_verified      = CASE WHEN status = 'paid' THEN true ELSE payment_verified END,
       payment_verified_at   = COALESCE(payment_verified_at, paid_at),
       membership_status     = CASE
         WHEN status = 'paid' AND (COALESCE(paid_at, created_at)::date + INTERVAL '1 year')::date < CURRENT_DATE THEN 'lapsed'
         WHEN status = 'paid' THEN 'active'
         WHEN status = 'cancelled' THEN 'cancelled'
         WHEN payment_method IN ('zelle','venmo') THEN 'pending_verification'
         ELSE 'pending'
       END;

CREATE INDEX IF NOT EXISTS ad_payments_membership_due_idx ON public.ad_payments (membership_due_date);
CREATE INDEX IF NOT EXISTS ad_payments_bill_later_due_idx ON public.ad_payments (bill_later_due_date);

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('membership-daily-maintenance')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'membership-daily-maintenance');

SELECT cron.schedule(
  'membership-daily-maintenance',
  '0 16 * * *',
  $$
  SELECT net.http_post(
    url := 'https://project--ed103cb5-eb75-4100-9676-a1eae1f15cec.lovable.app/api/public/memberships/daily',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56cGlpdHFkZ3B6a29zaWlwem1hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NDE0ODksImV4cCI6MjA5NzExNzQ4OX0.vjZN3LmGHJ1oCPpoAQP0vXo2dVMiVSj_I-Qan2KMCPE"}'::jsonb,
    body := '{"source":"pg_cron"}'::jsonb
  );
  $$
);