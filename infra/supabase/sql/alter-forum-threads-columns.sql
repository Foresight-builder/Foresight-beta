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

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'forum_threads_review_status_check'
  ) THEN
    ALTER TABLE public.forum_threads
      ADD CONSTRAINT forum_threads_review_status_check
      CHECK (review_status IN ('pending_review', 'approved', 'rejected', 'needs_changes'));
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_recipient_dedupe_unique
  ON public.notifications (recipient_id, dedupe_key)
  WHERE dedupe_key IS NOT NULL;
