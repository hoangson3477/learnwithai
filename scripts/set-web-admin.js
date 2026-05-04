/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}

async function main() {
  loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.argv[2];

  if (!email) {
    throw new Error('Usage: node scripts/set-web-admin.js <email>');
  }
  if (!url || !serviceKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(url, serviceKey);
  const { data, error } = await supabase
    .from('users')
    .update({ role: 'web_admin' })
    .eq('email', email)
    .select('id,email,role');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error(`No user found with email: ${email}`);
  }

  console.log('Updated role:', data);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
