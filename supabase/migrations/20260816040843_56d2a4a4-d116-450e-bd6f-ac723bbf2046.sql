ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS resend_message_id text,
  ADD COLUMN IF NOT EXISTS unsubscribed_at timestamptz,
  ADD COLUMN IF NOT EXISTS unsubscribe_token text;

CREATE UNIQUE INDEX IF NOT EXISTS leads_unsubscribe_token_key
  ON public.leads (unsubscribe_token) WHERE unsubscribe_token IS NOT NULL;