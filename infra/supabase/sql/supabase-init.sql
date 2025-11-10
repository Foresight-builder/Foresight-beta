-- Supabase数据库初始化脚本
-- 用于创建Foresight项目所需的表结构

-- 创建预测事件表
CREATE TABLE IF NOT EXISTS predictions (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  deadline TIMESTAMP NOT NULL,
  min_stake REAL NOT NULL,
  criteria TEXT NOT NULL,
  image_url TEXT DEFAULT '',
  reference_url TEXT DEFAULT '',
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建分类表
CREATE TABLE IF NOT EXISTS categories (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL
);

-- 插入默认分类
INSERT INTO categories (name) VALUES 
  ('科技'),
  ('娱乐'),
  ('时政'),
  ('天气')
ON CONFLICT (name) DO NOTHING;





-- 创建热门事件表（用于trending页面）
CREATE TABLE IF NOT EXISTS trending_events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  image_url TEXT NOT NULL,
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建事件关注表
CREATE TABLE IF NOT EXISTS event_follows (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_id, user_id)
);



-- 插入示例预测事件（不指定id，让序列自动生成）
INSERT INTO predictions (title, description, category, deadline, min_stake, criteria, reference_url, status) VALUES 
  (
    '比特币在2025年底是否突破10万美元？',
    '预测比特币价格在2025年12月31日前是否达到或超过10万美元',
    '科技',
    '2025-12-31 23:59:59',
    1,
    '根据CoinMarketCap官方数据，比特币价格在2025年12月31日23:59:59前达到或超过10万美元',
    'https://coinmarketcap.com/currencies/bitcoin/',
    'active'
  ),
  (
    '2024年全球平均气温是否创历史新高？',
    '预测2024年全球平均气温是否超过历史最高记录',
    '天气',
    '2024-12-31 23:59:59',
    1,
    '根据世界气象组织发布的2024年全球平均气温数据，是否超过2023年的记录',
    'https://public.wmo.int/',
    'active'
  );

-- 插入热门事件示例数据
INSERT INTO trending_events (title, description, category, image_url, followers_count) VALUES 
  (
    'AI技术突破预测',
    '预测2025年AI技术将迎来重大突破，可能改变人类生活方式',
    '科技',
    '/images/ai-tech.jpg',
    1250
  ),
  (
    '娱乐产业复苏',
    '预测2024年娱乐产业将完全复苏，票房收入创历史新高',
    '娱乐',
    '/images/entertainment.jpg',
    890
  ),
  (
    '气候变化政策',
    '预测各国将在2025年推出更严格的气候变化应对政策',
    '时政',
    '/images/climate.jpg',
    2100
  ),
  (
    '极端天气事件',
    '预测2024年全球极端天气事件频率将增加',
    '天气',
    '/images/weather.jpg',
    1560
  );

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_predictions_category ON predictions(category);
CREATE INDEX IF NOT EXISTS idx_predictions_status ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_trending_events_category ON trending_events(category);


-- 迁移修复：移除可能存在的 event_follows.user_id 外键并确保唯一约束
ALTER TABLE public.event_follows DROP CONSTRAINT IF EXISTS event_follows_user_id_fkey;

-- 尝试删除所有针对 user_id 的外键约束（名称不确定）
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'event_follows'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'user_id'
  LOOP
    EXECUTE format('ALTER TABLE public.event_follows DROP CONSTRAINT IF EXISTS %I;', r.constraint_name);
  END LOOP;
END
$$;

-- 将 user_id 统一为 TEXT 类型
ALTER TABLE public.event_follows ALTER COLUMN user_id TYPE TEXT;

-- 确保 (user_id, event_id) 唯一约束存在（使用唯一索引）
CREATE UNIQUE INDEX IF NOT EXISTS event_follows_user_id_event_id_key ON public.event_follows (user_id, event_id);