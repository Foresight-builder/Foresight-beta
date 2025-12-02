// Script to execute arbitrary SQL file using pg
// Usage: node run-sql.cjs <path-to-sql-file>
require('dotenv/config')
const fs = require('fs')
const path = require('path')

let Client
try {
  Client = require('pg').Client
} catch (e) {
  console.error('pg module not found. Run npm i pg')
  process.exit(1)
}

// Read from .env.local if not in process.env (simple shim)
if (!process.env.SUPABASE_CONNECTION_STRING && fs.existsSync('../../../.env.local')) {
  const content = fs.readFileSync('../../../.env.local', 'utf-8')
  const match = content.match(/SUPABASE_CONNECTION_STRING=(.+)/)
  if (match && match[1]) {
    process.env.SUPABASE_CONNECTION_STRING = match[1].trim()
  }
}

const connectionString = process.env.SUPABASE_DB_URL || process.env.SUPABASE_CONNECTION_STRING

if (!connectionString) {
  console.error('Missing SUPABASE_CONNECTION_STRING or SUPABASE_DB_URL')
  process.exit(1)
}

const sqlFile = process.argv[2]
if (!sqlFile) {
  console.error('Please provide SQL file path')
  process.exit(1)
}

const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

async function main() {
  try {
    await client.connect()
    console.log('Connected to Postgres')
    
    const sql = fs.readFileSync(sqlFile, 'utf-8')
    console.log(`Executing ${sqlFile}...`)
    
    await client.query(sql)
    console.log('Success!')
  } catch (e) {
    console.error('Error:', e.message)
  } finally {
    await client.end()
  }
}

main()
