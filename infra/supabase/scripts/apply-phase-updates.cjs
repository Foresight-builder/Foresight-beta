const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
const envPaths = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'apps/web/.env.local'),
  path.resolve(process.cwd(), 'apps/web/.env')
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading env from ${envPath}`);
    dotenv.config({ path: envPath });
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  const migrationFile = path.resolve(__dirname, '../sql/phase_updates.sql');
  
  if (!fs.existsSync(migrationFile)) {
    console.error(`Migration file not found: ${migrationFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(migrationFile, 'utf8');
  console.log('Applying migration...');

  // Try to use execute_sql RPC if available
  const { error } = await client.rpc('execute_sql', { sql });

  if (error) {
    console.error('Migration failed:', error);
    
    // Fallback advice if RPC is missing
    if (error.message.includes('function execute_sql') && error.message.includes('does not exist')) {
      console.error('\nNOTE: The "execute_sql" RPC function is missing in your database.');
      console.error('You need to run the following SQL in the Supabase SQL Editor manually to enable migrations via script:');
      console.error('\nCREATE OR REPLACE FUNCTION execute_sql(sql text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE sql; END; $$;');
    }
    process.exit(1);
  }

  console.log('Migration applied successfully!');
}

runMigration();
