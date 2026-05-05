import { createClient } from '@supabase/supabase-js';

// Trim whitespace and validate URL format
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Validate URL format
if (!supabaseUrl.startsWith('https://')) {
  console.error('Invalid Supabase URL format:', supabaseUrl.substring(0, 20) + '...');
  throw new Error('Supabase URL must start with https://');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default supabase;
