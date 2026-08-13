ALTER TABLE public.activation_codes
  ADD COLUMN IF NOT EXISTS artwork_choice text NOT NULL DEFAULT 'ours',
  ADD COLUMN IF NOT EXISTS customer_image_path text,
  ADD COLUMN IF NOT EXISTS chosen_image text NOT NULL DEFAULT 'ours',
  ADD COLUMN IF NOT EXISTS due_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS upload_token uuid NOT NULL DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS invoice_number text;

CREATE UNIQUE INDEX IF NOT EXISTS activation_codes_upload_token_key ON public.activation_codes (upload_token);