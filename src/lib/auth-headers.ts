import supabase from '@/lib/db/supabase';
import { createServiceSupabase } from '@/lib/db/server';

export async function getAuthHeaders(extra?: HeadersInit): Promise<HeadersInit> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(extra ?? {}),
  };
}

export interface AuthResult {
  authenticated: boolean;
  userId?: string;
  role?: string;
  error?: string;
}

export async function getAuth(request: Request): Promise<AuthResult> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    return { authenticated: false, error: 'No token provided' };
  }

  try {
    const serviceSupabase = createServiceSupabase();
    const { data, error } = await serviceSupabase.auth.getUser(token);

    if (error || !data.user) {
      return { authenticated: false, error: 'Invalid token' };
    }

    // Get user role
    const { data: userData } = await serviceSupabase
      .from('users')
      .select('role')
      .eq('id', data.user.id)
      .single();

    return {
      authenticated: true,
      userId: data.user.id,
      role: userData?.role,
    };
  } catch {
    return { authenticated: false, error: 'Auth failed' };
  }
}
