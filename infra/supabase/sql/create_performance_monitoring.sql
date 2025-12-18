-- 性能监控数据表
-- 用于存储 Web Vitals 和自定义性能指标

-- 1. Web Vitals 指标表
CREATE TABLE IF NOT EXISTS web_vitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 指标信息
  metric_name TEXT NOT NULL CHECK (metric_name IN ('CLS', 'FID', 'FCP', 'LCP', 'TTFB', 'INP')),
  metric_value NUMERIC NOT NULL CHECK (metric_value >= 0),
  metric_rating TEXT CHECK (metric_rating IN ('good', 'needs-improvement', 'poor')),
  metric_delta NUMERIC,
  metric_id TEXT,
  
  -- 页面信息
  page_url TEXT NOT NULL,
  page_path TEXT GENERATED ALWAYS AS (
    CASE 
      WHEN position('?' in page_url) > 0 THEN substring(page_url from position('//' in page_url) + 2 for position('?' in page_url) - position('//' in page_url) - 2)
      ELSE substring(page_url from position('//' in page_url) + 2)
    END
  ) STORED,
  
  -- 用户信息
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  
  -- 设备信息
  device_type TEXT CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  browser TEXT,
  os TEXT,
  screen_resolution TEXT,
  
  -- 网络信息
  connection_type TEXT,
  connection_effective_type TEXT CHECK (connection_effective_type IN ('slow-2g', '2g', '3g', '4g', 'unknown')),
  
  -- 导航信息
  navigation_type TEXT,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 索引优化
  CONSTRAINT web_vitals_metric_check CHECK (metric_value < 1000000)
);

-- 索引
CREATE INDEX idx_web_vitals_created_at ON web_vitals(created_at DESC);
CREATE INDEX idx_web_vitals_metric_name ON web_vitals(metric_name);
CREATE INDEX idx_web_vitals_page_path ON web_vitals(page_path);
CREATE INDEX idx_web_vitals_user_id ON web_vitals(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_web_vitals_device_type ON web_vitals(device_type);
CREATE INDEX idx_web_vitals_rating ON web_vitals(metric_rating);

-- 2. 自定义性能指标表
CREATE TABLE IF NOT EXISTS custom_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 指标信息
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT DEFAULT 'ms' CHECK (metric_unit IN ('ms', 's', 'bytes', 'count', 'percent')),
  
  -- 操作信息
  operation_type TEXT NOT NULL,
  operation_details JSONB,
  
  -- 页面信息
  page_url TEXT,
  
  -- 用户信息
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_custom_metrics_created_at ON custom_metrics(created_at DESC);
CREATE INDEX idx_custom_metrics_metric_name ON custom_metrics(metric_name);
CREATE INDEX idx_custom_metrics_operation_type ON custom_metrics(operation_type);

-- 3. API 性能监控表
CREATE TABLE IF NOT EXISTS api_performance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- API 信息
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL CHECK (method IN ('GET', 'POST', 'PUT', 'DELETE', 'PATCH')),
  status_code INTEGER NOT NULL,
  
  -- 性能指标
  duration_ms NUMERIC NOT NULL CHECK (duration_ms >= 0),
  response_size_bytes INTEGER,
  
  -- 请求信息
  query_params JSONB,
  request_body_size_bytes INTEGER,
  
  -- 错误信息
  error_message TEXT,
  error_code TEXT,
  
  -- 用户信息
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  
  -- 时间戳
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_api_performance_created_at ON api_performance(created_at DESC);
CREATE INDEX idx_api_performance_endpoint ON api_performance(endpoint);
CREATE INDEX idx_api_performance_status_code ON api_performance(status_code);
CREATE INDEX idx_api_performance_duration ON api_performance(duration_ms DESC);

-- 4. 性能统计视图（每小时聚合）
CREATE OR REPLACE VIEW performance_stats_hourly AS
SELECT 
  metric_name,
  DATE_TRUNC('hour', created_at) as hour,
  
  -- 统计指标
  COUNT(*) as sample_count,
  AVG(metric_value) as avg_value,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value) as p50,
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) as p75,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value) as p95,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value) as p99,
  MIN(metric_value) as min_value,
  MAX(metric_value) as max_value,
  
  -- 评分分布
  SUM(CASE WHEN metric_rating = 'good' THEN 1 ELSE 0 END) as good_count,
  SUM(CASE WHEN metric_rating = 'needs-improvement' THEN 1 ELSE 0 END) as needs_improvement_count,
  SUM(CASE WHEN metric_rating = 'poor' THEN 1 ELSE 0 END) as poor_count,
  
  -- 设备分布
  SUM(CASE WHEN device_type = 'mobile' THEN 1 ELSE 0 END) as mobile_count,
  SUM(CASE WHEN device_type = 'desktop' THEN 1 ELSE 0 END) as desktop_count,
  SUM(CASE WHEN device_type = 'tablet' THEN 1 ELSE 0 END) as tablet_count
FROM web_vitals
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY metric_name, hour
ORDER BY hour DESC, metric_name;

-- 5. API 性能统计视图
CREATE OR REPLACE VIEW api_stats_hourly AS
SELECT 
  endpoint,
  method,
  DATE_TRUNC('hour', created_at) as hour,
  
  -- 请求统计
  COUNT(*) as request_count,
  SUM(CASE WHEN status_code < 400 THEN 1 ELSE 0 END) as success_count,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count,
  
  -- 性能统计
  AVG(duration_ms) as avg_duration,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as p50_duration,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms) as p95_duration,
  MAX(duration_ms) as max_duration,
  
  -- 错误率
  (SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::FLOAT / COUNT(*)) * 100 as error_rate
FROM api_performance
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY endpoint, method, hour
ORDER BY hour DESC, endpoint, method;

-- 6. 慢查询视图（响应时间 > 2秒）
CREATE OR REPLACE VIEW slow_apis AS
SELECT 
  endpoint,
  method,
  status_code,
  duration_ms,
  error_message,
  user_id,
  created_at
FROM api_performance
WHERE duration_ms > 2000
  AND created_at > NOW() - INTERVAL '7 days'
ORDER BY duration_ms DESC
LIMIT 100;

-- 7. 性能趋势视图（按天）
CREATE OR REPLACE VIEW performance_trends_daily AS
SELECT 
  metric_name,
  DATE_TRUNC('day', created_at) as day,
  
  -- Core Web Vitals 阈值
  CASE 
    WHEN metric_name = 'LCP' THEN 
      SUM(CASE WHEN metric_value <= 2500 THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100
    WHEN metric_name = 'FID' THEN 
      SUM(CASE WHEN metric_value <= 100 THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100
    WHEN metric_name = 'CLS' THEN 
      SUM(CASE WHEN metric_value <= 0.1 THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100
    WHEN metric_name = 'FCP' THEN 
      SUM(CASE WHEN metric_value <= 1800 THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100
    WHEN metric_name = 'TTFB' THEN 
      SUM(CASE WHEN metric_value <= 800 THEN 1 ELSE 0 END)::FLOAT / COUNT(*) * 100
    ELSE 0
  END as good_percentage,
  
  PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY metric_value) as p75_value,
  COUNT(*) as sample_count
FROM web_vitals
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY metric_name, day
ORDER BY day DESC, metric_name;

-- 8. RLS 策略（只有管理员可以查看性能数据）
ALTER TABLE web_vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_performance ENABLE ROW LEVEL SECURITY;

-- 允许插入（任何人都可以上报数据）
CREATE POLICY "允许所有人插入 web_vitals" ON web_vitals
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许所有人插入 custom_metrics" ON custom_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "允许所有人插入 api_performance" ON api_performance
  FOR INSERT WITH CHECK (true);

-- 只允许管理员查询
CREATE POLICY "只允许管理员查询 web_vitals" ON web_vitals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "只允许管理员查询 custom_metrics" ON custom_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "只允许管理员查询 api_performance" ON api_performance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 9. 自动清理旧数据（保留 90 天）
-- 需要设置 pg_cron 扩展
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- SELECT cron.schedule(
--   'clean-old-performance-data',
--   '0 2 * * *', -- 每天凌晨 2 点执行
--   $$
--   DELETE FROM web_vitals WHERE created_at < NOW() - INTERVAL '90 days';
--   DELETE FROM custom_metrics WHERE created_at < NOW() - INTERVAL '90 days';
--   DELETE FROM api_performance WHERE created_at < NOW() - INTERVAL '90 days';
--   $$
-- );

-- 注释：可以手动运行清理
COMMENT ON TABLE web_vitals IS '存储 Web Vitals 性能指标，保留 90 天';
COMMENT ON TABLE custom_metrics IS '存储自定义性能指标，保留 90 天';
COMMENT ON TABLE api_performance IS '存储 API 性能数据，保留 90 天';

