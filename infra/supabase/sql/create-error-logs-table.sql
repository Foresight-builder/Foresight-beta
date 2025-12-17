-- 创建错误日志表
-- 用于记录前端错误，便于监控和调试

CREATE TABLE IF NOT EXISTS error_logs (
  id BIGSERIAL PRIMARY KEY,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  error_digest TEXT,
  url TEXT,
  user_agent TEXT,
  component_stack TEXT,
  user_address TEXT,
  session_id TEXT,
  severity TEXT DEFAULT 'error' CHECK(severity IN ('info', 'warning', 'error', 'critical')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_error_logs_created_at 
ON error_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_error_logs_severity 
ON error_logs (severity);

CREATE INDEX IF NOT EXISTS idx_error_logs_digest 
ON error_logs (error_digest);

CREATE INDEX IF NOT EXISTS idx_error_logs_user_address 
ON error_logs (user_address);

-- 创建视图：最近的严重错误
CREATE OR REPLACE VIEW recent_critical_errors AS
SELECT 
  id,
  error_message,
  error_digest,
  url,
  created_at
FROM error_logs
WHERE severity = 'critical'
  AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC
LIMIT 100;

-- 创建视图：错误统计
CREATE OR REPLACE VIEW error_stats AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour,
  severity,
  COUNT(*) as error_count,
  COUNT(DISTINCT error_digest) as unique_errors,
  COUNT(DISTINCT user_address) as affected_users
FROM error_logs
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', created_at), severity
ORDER BY hour DESC;

-- 自动清理旧日志（保留30天）
-- 需要配置 pg_cron
/*
SELECT cron.schedule(
    'cleanup_old_error_logs',
    '0 2 * * *',  -- 每天凌晨2点
    $$
    DELETE FROM error_logs 
    WHERE created_at < NOW() - INTERVAL '30 days'
    $$
);
*/

COMMENT ON TABLE error_logs IS '前端错误日志记录表';
COMMENT ON VIEW recent_critical_errors IS '最近24小时的严重错误';
COMMENT ON VIEW error_stats IS '错误统计数据（按小时聚合）';

