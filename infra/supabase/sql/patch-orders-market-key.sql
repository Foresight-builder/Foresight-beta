ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS market_key TEXT;
CREATE INDEX IF NOT EXISTS orders_market_key_idx ON public.orders (market_key);

