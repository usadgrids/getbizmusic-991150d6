CREATE TABLE public.directory_topic_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  topic_slug text NOT NULL,
  topic_label text NOT NULL,
  question text NOT NULL,
  answer text NOT NULL,
  faqs jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, topic_slug)
);

GRANT SELECT ON public.directory_topic_pages TO anon;
GRANT SELECT ON public.directory_topic_pages TO authenticated;
GRANT ALL ON public.directory_topic_pages TO service_role;

ALTER TABLE public.directory_topic_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Topic pages are publicly readable"
ON public.directory_topic_pages FOR SELECT
USING (true);