import { NextResponse } from 'next/server'
import { addComment } from '@/lib/localForumStore'

function toNum(v: any): number | null { const n = Number(v); return Number.isFinite(n) ? n : null }

async function parseBody(req: Request): Promise<Record<string, any>> {
  const ct = req.headers.get('content-type') || ''
  try {
    if (ct.includes('application/json')) { const txt = await req.text(); try { return JSON.parse(txt) } catch { return {} } }
    if (ct.includes('application/x-www-form-urlencoded')) { const txt = await req.text(); const params = new URLSearchParams(txt); return Object.fromEntries(params.entries()) }
    if (ct.includes('multipart/form-data')) {
      const form = await (req as any).formData?.();
      if (form && typeof (form as any).entries === 'function') {
        const obj: Record<string, any> = {}
        for (const [k, v] of (form as any).entries()) obj[k] = v as any
        return obj
      }
      return {}
    }
    const txt = await req.text(); if (txt) { try { return JSON.parse(txt) } catch { return {} } }
    return {}
  } catch { return {} }
}

// POST /api/forum/comments  body: { eventId, threadId, content, walletAddress, parentId? }
export async function POST(req: Request) {
  try {
    const body = await parseBody(req)
    const eventId = toNum(body?.eventId)
    const threadId = toNum(body?.threadId)
    const parentId = body?.parentId == null ? null : toNum(body?.parentId)
    const content = String(body?.content || '')
    const walletAddress = String(body?.walletAddress || '')
    if (!eventId || !threadId || !content.trim()) {
      return NextResponse.json({ message: 'eventId、threadId、content 必填' }, { status: 400 })
    }
    const comment = await addComment(walletAddress || 'guest', eventId, threadId, content, parentId)
    return NextResponse.json({ message: 'ok', data: comment }, { status: 200 })
  } catch (e: any) {
    return NextResponse.json({ message: '创建失败', detail: String(e?.message || e) }, { status: 500 })
  }
}