import { NextRequest } from 'next/server';
import { createServiceSupabase, createServerSupabaseWithAuth } from '@/lib/db/server';

const supabaseAdmin = createServiceSupabase();

export async function checkAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return { user: null, error: 'Missing authorization header', token: null };
    }

    const token = authHeader.slice(7);
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return { user: null, error: 'Invalid or expired token', token: null };
    }

    return { user: data.user, error: null, token };
  } catch {
    return { user: null, error: 'Auth check failed', token: null };
  }
}

export function getAuthedClient(token: string) {
  return createServerSupabaseWithAuth(token);
}
