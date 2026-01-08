-- Add missing columns to discussions table to match API handler
ALTER TABLE public.discussions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.discussions ADD COLUMN IF NOT EXISTS topic TEXT;
ALTER TABLE public.discussions ADD COLUMN IF NOT EXISTS reply_to_id BIGINT;
ALTER TABLE public.discussions ADD COLUMN IF NOT EXISTS reply_to_user TEXT;
ALTER TABLE public.discussions ADD COLUMN IF NOT EXISTS reply_to_content TEXT;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
