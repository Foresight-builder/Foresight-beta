import { NextResponse } from 'next/server'
import { voteComment, voteThread } from '@/lib/localForumStore'

function toNum(v: any): number | null { const n = Number(v); return Number.isFinite(n) ? n : null }

// POST /api/forum/vote  body: { type: 'thread'|'comment', id: number, dir: 'up'|'down' }
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({})) as any
    const type = body?.type === 'comment' ? 'comment' : 'thread'
    const dir = body?.dir === 'down' ? 'down' : 'up'
    const id = toNum(body?.id)
    if (!id) return NextResponse.json({ message: 'id 必填' }, { status: 400 })
    const result = type === 'thread' ? await voteThread(id, dir) : await voteComment(id, dir)
    if (!result) return NextResponse.json({ message: '未找到对象' }, { status: 404 })
    return NextResponse.json({ message: 'ok', data: result })
  } catch (e: any) {
    return NextResponse.json({ message: '投票失败', detail: String(e?.message || e) }, { status: 500 })
  }
}