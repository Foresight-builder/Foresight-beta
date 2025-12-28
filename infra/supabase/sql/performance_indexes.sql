-- =====================================================
-- 数据库性能优化索引
-- =====================================================
-- 
-- 本脚本创建关键索引以提升查询性能
-- 在 Supabase SQL Editor 中执行
--
-- =====================================================

-- 1. predictions 表索引优化
-- -----------------------------------------------------

-- 复合索引：状态+创建时间（用于列表查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_predictions_status_created 
ON public.predictions(status, created_at DESC);

-- 复合索引：分类+状态（用于分类筛选）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_predictions_category_status 
ON public.predictions(category, status);

-- 截止时间索引（用于即将结束的事件查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_predictions_deadline 
ON public.predictions(deadline) WHERE status = 'active';

-- 关注数索引（用于热门排序）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_predictions_followers 
ON public.predictions(followers_count DESC) WHERE status = 'active';

-- 2. trades 表索引优化
-- -----------------------------------------------------

-- 市场地址+链ID复合索引（最常用的查询条件）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_market_chain 
ON public.trades(market_address, network_id);

-- 时间戳索引（用于最近成交查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_timestamp 
ON public.trades(block_timestamp DESC);

-- 用户地址索引（用于用户历史查询）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_taker 
ON public.trades(taker_address);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_maker 
ON public.trades(maker_address);

-- 复合索引：市场+结果+时间（用于 K 线数据）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trades_market_outcome_time 
ON public.trades(market_address, outcome_index, block_timestamp DESC);

-- 3. orders 表索引优化
-- -----------------------------------------------------

-- 订单簿查询优化（状态+市场+价格）
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_book_query 
ON public.orders(verifying_contract, chain_id, outcome_index, is_buy, price DESC)
WHERE status = 'open';

-- 用户订单查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_maker_status 
ON public.orders(maker_address, status);

-- market_key 索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_market_key_status 
ON public.orders(market_key, status);

-- 4. event_follows 表索引优化
-- -----------------------------------------------------

-- 用户关注查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_follows_user 
ON public.event_follows(user_id);

-- 事件关注数统计
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_event_follows_event 
ON public.event_follows(event_id);

-- 5. markets_map 表索引优化
-- -----------------------------------------------------

-- 市场地址查询
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_markets_map_market 
ON public.markets_map(market);

-- 6. forum 相关表索引优化
-- -----------------------------------------------------

-- 论坛主题：事件ID+创建时间
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_threads_event_created 
ON public.forum_threads(event_id, created_at DESC);

-- 论坛评论：主题ID+创建时间
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_forum_comments_thread_created 
ON public.forum_comments(thread_id, created_at DESC);

-- 7. candles 表索引优化（如果存在）
-- -----------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'candles') THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_candles_lookup 
      ON public.candles(market_address, outcome_index, interval, open_time DESC)';
  END IF;
END $$;

-- 8. prediction_stats 表索引（如果存在）
-- -----------------------------------------------------

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prediction_stats') THEN
    EXECUTE 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prediction_stats_total 
      ON public.prediction_stats(total_amount DESC)';
  END IF;
END $$;

-- =====================================================
-- 分析表以更新统计信息
-- =====================================================

ANALYZE public.predictions;
ANALYZE public.trades;
ANALYZE public.orders;
ANALYZE public.event_follows;
ANALYZE public.markets_map;
ANALYZE public.forum_threads;
ANALYZE public.forum_comments;

-- =====================================================
-- 使用说明
-- =====================================================
-- 
-- 1. 使用 CONCURRENTLY 创建索引不会锁表，可以在生产环境安全执行
-- 2. 索引创建后，PostgreSQL 会自动使用它们优化查询
-- 3. ANALYZE 命令更新表统计信息，帮助查询优化器做出更好的决策
-- 4. 定期运行 ANALYZE 以保持统计信息最新
--
-- 查看索引使用情况：
-- SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch 
-- FROM pg_stat_user_indexes 
-- WHERE schemaname = 'public'
-- ORDER BY idx_scan DESC;
--
-- =====================================================

