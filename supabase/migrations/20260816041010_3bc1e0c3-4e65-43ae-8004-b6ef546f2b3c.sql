ALTER TABLE public.email_send_log
  ADD COLUMN IF NOT EXISTS provider_message_id text;