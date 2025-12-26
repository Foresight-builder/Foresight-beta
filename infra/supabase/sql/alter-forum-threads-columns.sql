ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS subject_name TEXT;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS action_verb TEXT;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS target_value TEXT;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS deadline TIMESTAMPTZ;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS title_preview TEXT;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS criteria_preview TEXT;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS hot_since TIMESTAMPTZ;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS created_prediction_id BIGINT;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS review_status TEXT;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS reviewed_by TEXT;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
ALTER TABLE public.forum_threads ADD COLUMN IF NOT EXISTS review_reason TEXT;

ALTER TABLE public.forum_threads ALTER COLUMN review_status SET DEFAULT 'pending_review';
UPDATE public.forum_threads
SET review_status = 'pending_review'
WHERE review_status IS NULL
  AND event_id = 0;
