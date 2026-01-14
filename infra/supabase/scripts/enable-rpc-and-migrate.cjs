const { Client } = require('pg');
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

// Try to find a connection string
const connectionString = process.env.SUPABASE_DB_URL || process.env.SUPABASE_CONNECTION_STRING || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Missing database connection string (SUPABASE_DB_URL, SUPABASE_CONNECTION_STRING, or DATABASE_URL)');
  console.error('Cannot connect directly to PostgreSQL to enable RPC or run migrations.');
  process.exit(1);
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false } // Required for Supabase
});

async function enableRpcAndMigrate() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database directly.');

    // 1. Enable execute_sql RPC function
    console.log('Creating execute_sql function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.execute_sql(sql text) 
      RETURNS void 
      LANGUAGE plpgsql 
      SECURITY DEFINER 
      AS $$ 
      BEGIN 
        EXECUTE sql; 
      END; 
      $$;
    `);
    console.log('Function execute_sql created successfully.');

    // 2. Run the migration
    const migrationFile = path.resolve(__dirname, '../sql/phase_updates.sql');
    if (fs.existsSync(migrationFile)) {
      const sql = fs.readFileSync(migrationFile, 'utf8');
      console.log('Applying migration via direct connection...');
      await client.query(sql);
      console.log('Migration applied successfully!');
    } else {
      console.error('Migration file not found:', migrationFile);
    }

  } catch (err) {
    console.error('Database operation failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

enableRpcAndMigrate();
