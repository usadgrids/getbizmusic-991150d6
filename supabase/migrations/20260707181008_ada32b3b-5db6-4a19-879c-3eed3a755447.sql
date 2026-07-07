-- Prevent duplicate ads from double-approval of the same submission.
DELETE FROM public.ads WHERE ad_number = 2968 AND submission_id = 'eb5f9c61-90fa-4728-b697-f84e11814275';
CREATE UNIQUE INDEX IF NOT EXISTS ads_submission_id_unique ON public.ads(submission_id) WHERE submission_id IS NOT NULL;