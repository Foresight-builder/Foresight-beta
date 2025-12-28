-- =====================================================
-- 创建 prediction_stats 表来存储预测事件的统计数据
-- =====================================================
-- 
-- 问题背景：
-- - trending 页面显示成交量为 0，是因为 prediction_stats 表不存在
-- - 成交数据存储在 trades 表中，通过 markets_map 关联到 predictions
-- - 需要创建 prediction_stats 表并同步数据
--
-- =====================================================

-- 0. 先删除可能存在的同名视图
DROP VIEW IF EXISTS public.prediction_stats CASCADE;

-- 1. 创建 prediction_stats 表
CREATE TABLE IF NOT EXISTS public.prediction_stats (
  prediction_id BIGINT PRIMARY KEY REFERENCES public.predictions(id) ON DELETE CASCADE,
  yes_amount NUMERIC DEFAULT 0,
  no_amount NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  participant_count INTEGER DEFAULT 0,
  bet_count INTEGER DEFAULT 0,
  last_updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prediction_stats_prediction_id 
ON public.prediction_stats(prediction_id);

COMMENT ON TABLE public.prediction_stats IS '预测事件统计数据（成交量、参与人数等）';

-- 2. 启用 RLS
ALTER TABLE public.prediction_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prediction_stats_select_all" ON public.prediction_stats FOR SELECT USING (true);

-- 3. 创建函数：从 trades 表聚合统计数据到 prediction_stats
CREATE OR REPLACE FUNCTION public.refresh_prediction_stats()
RETURNS void AS $$
BEGIN
  -- 清空并重新计算所有统计
  -- 通过 markets_map 关联 predictions 和 trades
  -- 只处理在 predictions 表中存在的记录（避免外键约束错误）
  INSERT INTO public.prediction_stats (
    prediction_id,
    yes_amount,
    no_amount,
    total_amount,
    participant_count,
    bet_count,
    last_updated_at
  )
  SELECT 
    m.event_id AS prediction_id,
    COALESCE(SUM(CASE WHEN t.outcome_index = 0 THEN t.amount * t.price / 1000000 ELSE 0 END), 0) AS yes_amount,
    COALESCE(SUM(CASE WHEN t.outcome_index = 1 THEN t.amount * t.price / 1000000 ELSE 0 END), 0) AS no_amount,
    COALESCE(SUM(t.amount * t.price / 1000000), 0) AS total_amount,
    COUNT(DISTINCT t.taker_address) + COUNT(DISTINCT t.maker_address) AS participant_count,
    COUNT(*) AS bet_count,
    NOW() AS last_updated_at
  FROM public.markets_map m
  INNER JOIN public.predictions p ON p.id = m.event_id
  LEFT JOIN public.trades t ON t.market_address = m.market AND t.network_id = m.chain_id
  GROUP BY m.event_id
  ON CONFLICT (prediction_id) DO UPDATE SET
    yes_amount = EXCLUDED.yes_amount,
    no_amount = EXCLUDED.no_amount,
    total_amount = EXCLUDED.total_amount,
    participant_count = EXCLUDED.participant_count,
    bet_count = EXCLUDED.bet_count,
    last_updated_at = EXCLUDED.last_updated_at;

  -- 也处理有 bets 表数据的预测（旧系统兼容）
  INSERT INTO public.prediction_stats (
    prediction_id,
    yes_amount,
    no_amount,
    total_amount,
    participant_count,
    bet_count,
    last_updated_at
  )
  SELECT 
    b.prediction_id,
    COALESCE(SUM(CASE WHEN b.outcome = 'yes' THEN b.amount ELSE 0 END), 0) AS yes_amount,
    COALESCE(SUM(CASE WHEN b.outcome = 'no' THEN b.amount ELSE 0 END), 0) AS no_amount,
    COALESCE(SUM(b.amount), 0) AS total_amount,
    COUNT(DISTINCT b.user_id) AS participant_count,
    COUNT(*) AS bet_count,
    NOW() AS last_updated_at
  FROM public.bets b
  WHERE NOT EXISTS (
    SELECT 1 FROM public.prediction_stats ps WHERE ps.prediction_id = b.prediction_id
  )
  GROUP BY b.prediction_id
  ON CONFLICT (prediction_id) DO UPDATE SET
    yes_amount = prediction_stats.yes_amount + EXCLUDED.yes_amount,
    no_amount = prediction_stats.no_amount + EXCLUDED.no_amount,
    total_amount = prediction_stats.total_amount + EXCLUDED.total_amount,
    participant_count = prediction_stats.participant_count + EXCLUDED.participant_count,
    bet_count = prediction_stats.bet_count + EXCLUDED.bet_count,
    last_updated_at = EXCLUDED.last_updated_at;

  RAISE NOTICE 'prediction_stats refreshed successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.refresh_prediction_stats() IS '刷新预测事件统计数据（从 trades/bets 表聚合）';

-- 4. 创建触发器：当 trades 表有新数据时自动更新统计
CREATE OR REPLACE FUNCTION public.update_prediction_stats_on_trade()
RETURNS TRIGGER AS $$
DECLARE
  v_event_id BIGINT;
  v_yes_delta NUMERIC := 0;
  v_no_delta NUMERIC := 0;
  v_trade_value NUMERIC;
BEGIN
  -- 查找对应的 prediction_id
  SELECT m.event_id INTO v_event_id
  FROM public.markets_map m
  WHERE m.market = NEW.market_address AND m.chain_id = NEW.network_id;

  IF v_event_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 计算成交金额 (amount * price / 1000000 转换为 USDC)
  v_trade_value := NEW.amount * NEW.price / 1000000;

  IF NEW.outcome_index = 0 THEN
    v_yes_delta := v_trade_value;
  ELSE
    v_no_delta := v_trade_value;
  END IF;

  -- 更新或插入统计数据
  INSERT INTO public.prediction_stats (
    prediction_id, yes_amount, no_amount, total_amount, participant_count, bet_count, last_updated_at
  ) VALUES (
    v_event_id, v_yes_delta, v_no_delta, v_trade_value, 2, 1, NOW()
  )
  ON CONFLICT (prediction_id) DO UPDATE SET
    yes_amount = prediction_stats.yes_amount + v_yes_delta,
    no_amount = prediction_stats.no_amount + v_no_delta,
    total_amount = prediction_stats.total_amount + v_trade_value,
    bet_count = prediction_stats.bet_count + 1,
    last_updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS on_trade_created ON public.trades;
CREATE TRIGGER on_trade_created
AFTER INSERT ON public.trades
FOR EACH ROW EXECUTE FUNCTION public.update_prediction_stats_on_trade();

-- 5. 初始化：立即刷新一次统计数据
SELECT public.refresh_prediction_stats();

-- =====================================================
-- 使用说明
-- =====================================================
-- 1. 首次运行此脚本后，会自动从 trades/bets 表聚合历史数据
-- 2. 新的成交会通过触发器自动更新统计
-- 3. 如需手动刷新，执行：
--    SELECT public.refresh_prediction_stats();
-- 4. 查看统计数据：
--    SELECT * FROM public.prediction_stats;
-- 5. 如果需要定时刷新（推荐），使用 pg_cron（需单独执行）

