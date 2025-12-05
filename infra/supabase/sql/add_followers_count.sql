-- Add followers_count to predictions
ALTER TABLE public.predictions ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;

-- Update existing counts
UPDATE public.predictions p
SET followers_count = (
  SELECT COUNT(*) FROM public.event_follows f WHERE f.event_id = p.id
);

-- Create function to increment count
CREATE OR REPLACE FUNCTION public.handle_new_follow()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.predictions
  SET followers_count = followers_count + 1
  WHERE id = NEW.event_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to decrement count
CREATE OR REPLACE FUNCTION public.handle_unfollow()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.predictions
  SET followers_count = followers_count - 1
  WHERE id = OLD.event_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS on_follow_created ON public.event_follows;
CREATE TRIGGER on_follow_created
AFTER INSERT ON public.event_follows
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_follow();

DROP TRIGGER IF EXISTS on_follow_deleted ON public.event_follows;
CREATE TRIGGER on_follow_deleted
AFTER DELETE ON public.event_follows
FOR EACH ROW EXECUTE PROCEDURE public.handle_unfollow();
