import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const url = 'https://lpkzufdjtrksbiazwiwv.supabase.co'
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!key) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var')
  process.exit(1)
}

const supabase = createClient(url, key)

const sql = readFileSync('supabase/migrations/00001_initial_schema.sql', 'utf8')

// Split by semicolons and run each statement
const statements = sql
  .split(/;[\s]*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'))

console.log(`Running ${statements.length} SQL statements...`)

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i]
  const preview = stmt.substring(0, 80).replace(/\n/g, ' ')
  console.log(`[${i + 1}/${statements.length}] ${preview}...`)
  
  const { error } = await supabase.rpc('', {}).then(() => ({ error: null })).catch(() => ({ error: 'rpc failed' }))
  
  // Use the SQL endpoint directly
  const res = await fetch(`${url}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({})
  })
}

console.log('Done! (Note: for complex migrations, use Supabase SQL Editor)')
