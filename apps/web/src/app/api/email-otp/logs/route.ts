import { NextRequest, NextResponse } from 'next/server'

type LogItem = { email: string; address: string; status: 'queued'|'sent'|'error'; messageId?: string; error?: string; sentAt: number }

function getLogs(): LogItem[] {
  const g = globalThis as any
  return (g.__emailOtpLogs as LogItem[]) || []
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const limit = Math.max(1, Math.min(50, Number(searchParams.get('limit') || 10)))
  const all = getLogs()
  const last = all.slice(-limit).reverse()
  return NextResponse.json({ logs: last })
}