console.error(
  [
    'This script no longer attempts to run SQL migrations over the Supabase REST API.',
    'Use one of these supported paths instead:',
    '1. supabase db push --linked',
    '2. supabase db query --linked --file supabase/migrations/<file>.sql',
    '3. Supabase SQL Editor for manual migration application',
    '',
    'For safe service-role project repairs that do not require database-level SQL access, run:',
    'node scripts/repair-supabase-state.mjs',
  ].join('\n')
)

process.exit(1)
