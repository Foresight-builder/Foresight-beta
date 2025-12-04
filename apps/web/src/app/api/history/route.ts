import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// POST /api/history  body: { eventId: number, walletAddress: string }
// GET /api/history?address=0x...

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ message: 'Supabase client not initialized' }, { status: 500 })
    }

    const body = await req.json()
    const { eventId, walletAddress } = body

    if (!eventId || !walletAddress) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    // 使用 upsert 确保每个用户对每个事件只记录一次，并更新时间
    const { error } = await supabaseAdmin
      .from('event_views')
      .upsert(
        { 
          user_id: walletAddress.toLowerCase(), 
          event_id: eventId,
          viewed_at: new Date().toISOString()
        },
        { onConflict: 'user_id, event_id' }
      )

    if (error) {
      console.error('Failed to record view history:', error)
      return NextResponse.json({ message: 'Failed to record history' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}

export async function GET(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ message: 'Supabase client not initialized' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const address = searchParams.get('address')

    if (!address) {
      return NextResponse.json({ message: 'Address is required' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('event_views')
      .select(`
        viewed_at,
        predictions (
          id,
          title,
          image_url,
          category
        )
      `)
      .eq('user_id', address.toLowerCase())
      .order('viewed_at', { ascending: false })
      .limit(50) // 限制最近 50 条

    if (error) {
      console.error('Failed to fetch history:', error)
      return NextResponse.json({ message: 'Failed to fetch history' }, { status: 500 })
    }

    // 格式化数据
    const history = (data || []).map((item: any) => ({
      id: item.predictions?.id,
      title: item.predictions?.title,
      image_url: item.predictions?.image_url,
      category: item.predictions?.category,
      viewed_at: item.viewed_at
    })).filter((item: any) => item.id) // 过滤掉关联查询为空的记录（例如事件已被删除）

    return NextResponse.json({ history })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
