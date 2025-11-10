import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, supabase } from '@/lib/supabase'

export async function GET(_req: NextRequest) {
  try {
    const env = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_RELAYER_URL: !!process.env.NEXT_PUBLIC_RELAYER_URL,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
      SUPABASE_DB_URL: !!process.env.SUPABASE_DB_URL,
      SUPABASE_CONNECTION_STRING: !!process.env.SUPABASE_CONNECTION_STRING
    }

    // 基础连通性与表存在检查（使用更高权限客户端优先，否则匿名）
    const client = supabaseAdmin || supabase

    const checks: Record<string, { ok: boolean; message?: string }> = {}

    // ping: 简单查询当前时间
    try {
      const { data: pingData, error: pingError } = await client
        .from('predictions')
        .select('id')
        .limit(1)
      checks.db_ping = { ok: !pingError }
      if (pingError) checks.db_ping.message = pingError.message
    } catch (e: any) {
      checks.db_ping = { ok: false, message: e?.message || String(e) }
    }

    // relayer ping（可选）
    try {
      const relayerUrl = process.env.NEXT_PUBLIC_RELAYER_URL
      if (relayerUrl) {
        const resp = await fetch(relayerUrl, { method: 'GET' })
        checks.relayer_ping = { ok: resp.ok, message: resp.statusText }
      } else {
        checks.relayer_ping = { ok: false, message: 'NEXT_PUBLIC_RELAYER_URL not set' }
      }
    } catch (e: any) {
      checks.relayer_ping = { ok: false, message: e?.message || String(e) }
    }

    // 表存在：predictions
    try {
      const { error } = await client
        .from('predictions')
        .select('id', { head: true, count: 'exact' })
        .limit(1)
      checks.table_predictions = { ok: !error }
      if (error) checks.table_predictions.message = error.message
    } catch (e: any) {
      checks.table_predictions = { ok: false, message: e?.message || String(e) }
    }

    // 表存在：event_follows
    try {
      const { error } = await client
        .from('event_follows')
        .select('id', { head: true, count: 'exact' })
        .limit(1)
      checks.table_event_follows = { ok: !error }
      if (error) checks.table_event_follows.message = error.message
    } catch (e: any) {
      checks.table_event_follows = { ok: false, message: e?.message || String(e) }
    }

    // RLS 提示：在无 service key 情况下读取 event_follows 的计数可能失败
    const rlsHint = !process.env.SUPABASE_SERVICE_KEY
      ? 'Missing service key; event_follows reads may be limited by RLS.'
      : 'Service key present.'

    const status = env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY && checks.db_ping.ok
      ? 'ok'
      : 'degraded'

    return NextResponse.json({ status, env, checks, rlsHint })
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error?.message || String(error) },
      { status: 500 }
    )
  }
}