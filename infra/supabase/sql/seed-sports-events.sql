-- 1. 插入体育类预测事件 (修正版)
INSERT INTO predictions (id, title, description, category, deadline, min_stake, status, image_url, type, outcome_count, created_at, criteria)
VALUES 
(101, '2024 欧洲杯冠军归属', '预测哪个国家队将赢得 2024 年欧洲足球锦标赛冠军。', '体育', NOW() + INTERVAL '30 days', 10, 'active', 'https://images.unsplash.com/photo-1522778119026-d647f0565c6a?auto=format&fit=crop&w=800&q=80', 'multi', 4, NOW(), '以官方最终比赛结果为准，包括加时赛和点球大战。'),
(102, 'NBA 2024-2025 赛季总冠军', '预测哪支球队将获得 NBA 总冠军奖杯。', '体育', NOW() + INTERVAL '60 days', 20, 'active', 'https://images.unsplash.com/photo-1504454138366-408b79d1b320?auto=format&fit=crop&w=800&q=80', 'multi', 4, NOW(), '以NBA官方宣布的总冠军归属为准。'),
(103, 'F1 2024 赛季车手总冠军', 'Max Verstappen 是否能成功卫冕？', '体育', NOW() + INTERVAL '90 days', 50, 'active', 'https://images.unsplash.com/photo-1535138690216-9952a4144182?auto=format&fit=crop&w=800&q=80', 'binary', 2, NOW(), '以FIA官方公布的赛季积分榜第一名为准。')
ON CONFLICT (id) DO UPDATE SET 
    category = EXCLUDED.category,
    criteria = EXCLUDED.criteria;

-- 2. 插入对应的选项 (Outcomes)
INSERT INTO prediction_outcomes (prediction_id, outcome_index, label)
VALUES 
(101, 0, '法国'), (101, 1, '英格兰'), (101, 2, '德国'), (101, 3, '其他'),
(102, 0, '凯尔特人'), (102, 1, '掘金'), (102, 2, '湖人'), (102, 3, '其他'),
(103, 0, 'Yes'), (103, 1, 'No')
ON CONFLICT DO NOTHING;

-- 3. 插入对应的市场映射 (Markets Map)
-- 假设 Chain ID 为 80002 (Amoy) 或 137 (Polygon)，这里使用 80002
-- 假设 Market Address 为示例地址
INSERT INTO markets_map (event_id, chain_id, market, collateral_token, status)
VALUES 
(101, 80002, '0x1010101010101010101010101010101010101010', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'open'),
(102, 80002, '0x1020202020202020202020202020202020202020', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'open'),
(103, 80002, '0x1030303030303030303030303030303030303030', '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', 'open')
ON CONFLICT (event_id, chain_id) DO UPDATE SET 
    market = EXCLUDED.market;

-- 4. 尝试为体育事件 "补上" 热度
-- 如果失败 (FK 约束)，则不做操作。
DO $$
DECLARE
    i integer;
BEGIN
    -- 只有当不存在 FK 约束或者我们不在乎失败时才尝试
    -- 为了演示效果，我们尝试插入。如果失败，我们将在前端代码中 "模拟" 热度。
    FOR i IN 1..85 LOOP
        BEGIN
            INSERT INTO event_follows (event_id, user_id, created_at)
            VALUES (101, gen_random_uuid(), NOW());
        EXCEPTION WHEN OTHERS THEN
            -- 忽略错误 (主要是 FK 违反)
            NULL;
        END;
    END LOOP;

    FOR i IN 1..65 LOOP
        BEGIN
            INSERT INTO event_follows (event_id, user_id, created_at)
            VALUES (102, gen_random_uuid(), NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END LOOP;
    
    FOR i IN 1..45 LOOP
        BEGIN
            INSERT INTO event_follows (event_id, user_id, created_at)
            VALUES (103, gen_random_uuid(), NOW());
        EXCEPTION WHEN OTHERS THEN NULL;
        END;
    END LOOP;
END $$;
