try {
  const path = require('path')
  const dotenv = require('dotenv')
  dotenv.config({ path: path.resolve(process.cwd(), '.env'), override: true })
  dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: true })
  dotenv.config({ path: path.resolve(__dirname, '..', '.env'), override: true })
  dotenv.config({ path: path.resolve(__dirname, '..', '.env.local'), override: true })
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env'), override: true })
  dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env.local'), override: true })
} catch {}

let Client
try {
  Client = require('pg').Client
} catch (e) {
  console.error('未找到 pg 依赖，请先运行: npm i pg')
  process.exit(1)
}

const connectionString =
  process.env.SUPABASE_DB_URL || process.env.SUPABASE_CONNECTION_STRING
if (!connectionString) {
  console.error('缺少数据库连接字符串：请在根 .env.local 或 infra/supabase/.env 中设置 SUPABASE_CONNECTION_STRING 或 SUPABASE_DB_URL')
  process.exit(1)
}

const statements = [
  `CREATE TABLE IF NOT EXISTS public.user_profiles (
    wallet_address TEXT PRIMARY KEY,
    username TEXT,
    email TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    is_reviewer BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,
  `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_reviewer BOOLEAN DEFAULT FALSE;`,
  `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS proxy_wallet_address TEXT;`,
  `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS proxy_wallet_type TEXT;`,
  `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS embedded_wallet_provider TEXT;`,
  `ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS embedded_wallet_address TEXT;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_proxy_wallet_address_unique
    ON public.user_profiles (proxy_wallet_address)
    WHERE proxy_wallet_address IS NOT NULL AND proxy_wallet_address <> '';`,
  `ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;`,
  `DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'user_profiles' AND policyname = 'Allow public read access'
    ) THEN
      EXECUTE 'CREATE POLICY "Allow public read access" ON public.user_profiles FOR SELECT USING (true)';
    END IF;
  END $$;`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);`
]

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })
  try {
    await client.connect()
    for (let i = 0; i < statements.length; i++) {
      const sql = statements[i]
      process.stdout.write(`执行语句 ${i + 1}/${statements.length}: ${sql}\n`)
      await client.query(sql)
    }
    console.log('user_profiles 表创建完成')
  } catch (err) {
    console.error('创建失败:', err?.message || err)
    process.exit(1)
  } finally {
    try { await client.end() } catch {}
  }
}

main().catch((e) => { console.error(e); process.exit(2) })
