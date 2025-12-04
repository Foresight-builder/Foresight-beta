import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// GET /api/user-portfolio?address=0x...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ message: 'Wallet address is required' }, { status: 400 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ message: 'Supabase client not initialized' }, { status: 500 })
    }

    // 1. 获取用户的持仓记录 (Active positions)
    // 注意：这里假设有一个 positions 表或通过 event_participants/orders 等表关联查询
    // 简化起见，我们先查询 event_participants 表，这通常记录了参与情况
    // 实际生产中可能需要查询链上数据或 indexer 数据库
    
    // 这里我们暂时用 event_follows 模拟，因为目前还没有完整的链下持仓同步逻辑
    // TODO: 替换为真实的持仓表查询
    const { data: follows, error: followsError } = await supabaseAdmin
      .from('event_follows')
      .select(`
        event_id,
        created_at,
        predictions (
          id,
          title,
          image_url,
          status,
          min_stake,
          outcomes (
            label,
            outcome_index
          )
        )
      `)
      .eq('user_id', address)
      .order('created_at', { ascending: false })

    if (followsError) {
      console.error('Error fetching portfolio:', followsError)
      return NextResponse.json({ message: 'Failed to fetch portfolio' }, { status: 500 })
    }

    // 转换数据格式
    const positions = (follows || []).map((item: any) => ({
      id: item.event_id,
      title: item.predictions?.title || 'Unknown Event',
      image_url: item.predictions?.image_url || `https://api.dicebear.com/7.x/shapes/svg?seed=${item.event_id}`,
      status: item.predictions?.status || 'active',
      stake: item.predictions?.min_stake || 10, // 模拟数据：暂用最小押注代替实际持仓
      outcome: 'Yes', // 模拟数据：暂定
      pnl: '+0%', // 模拟数据：暂无 PnL 计算逻辑
      joined_at: item.created_at
    }))

    return NextResponse.json({ 
      positions,
      stats: {
        total_invested: positions.reduce((acc: number, curr: any) => acc + (curr.stake || 0), 0),
        active_count: positions.filter((p: any) => p.status === 'active').length,
        win_rate: '0%' // 暂无历史数据计算
      }
    })

  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ message: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
