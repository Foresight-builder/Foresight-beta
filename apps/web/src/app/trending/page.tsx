import { getClient } from '@/lib/supabase';
import TrendingClient from './TrendingClient';

// 设置为动态渲染，因为预测数据经常变化
export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getPredictions() {
  const client = getClient();
  if (!client) return [];

  // 构建Supabase查询 - 与 /api/predictions 逻辑保持一致
  // 1. 获取所有预测事件
  const { data: predictions, error } = await client
    .from('predictions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error || !predictions) {
    console.error('Server fetch predictions error:', error);
    return [];
  }

  // 2. 批量获取关注数
  const ids = predictions.map((p: any) => Number(p?.id)).filter((n: number) => Number.isFinite(n));
  let counts: Record<number, number> = {};
  
  if (ids.length > 0) {
    // 尝试使用 followers_count 字段（如果存在）
    // 但为了兼容性，我们还是使用 event_follows 表查询
    // 优化：使用一条 SQL 查询所有关注
    const { data: rows, error: rowsError } = await client
      .from('event_follows')
      .select('event_id');
    
    if (!rowsError && Array.isArray(rows)) {
       // 在内存中聚合，对于小规模数据（<10k rows）比多次 DB 调用快
       // 如果数据量大，应该使用 rpc 或视图
       for (const r of rows as any[]) {
         const eid = Number((r as any)?.event_id);
         if (Number.isFinite(eid) && ids.includes(eid)) {
           counts[eid] = (counts[eid] || 0) + 1;
         }
       }
    } else {
      // Fallback: 如果 select * 失败或太慢，可以用 count 查询 (N+1 problem solved by logic above, but this is just safety)
    }
  }

  const predictionsWithFollowersCount = predictions.map((p: any) => ({
    ...p,
    followers_count: counts[Number(p?.id)] || 0,
  }));

  return predictionsWithFollowersCount;
}

export default async function Page() {
  const predictions = await getPredictions();
  
  return <TrendingClient initialPredictions={predictions} />;
}
