import { createClient } from '@supabase/supabase-js'

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!url || !anon) {
    console.error('缺少 Supabase 环境变量: NEXT_PUBLIC_SUPABASE_URL 或 NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }
  const supabase = createClient(url, anon)
  const ping = await supabase.from('event_follows').select('*').limit(1)
  if (ping.error) {
    console.error('连接失败或RLS限制:', ping.error.message)
    process.exit(2)
  }
  console.log('Supabase连接正常，返回行数:', (ping.data || []).length)
}

main().catch((e) => { console.error(e); process.exit(3) })
