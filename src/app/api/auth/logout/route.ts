import { NextRequest, NextResponse } from 'next/server';
import { checkAuth } from '@/lib/auth-api';
import { createServiceSupabase } from '@/lib/db/server';

export async function POST(request: NextRequest) {
  try {
    const { token, error: authError } = await checkAuth(request);
    if (!token) {
      return NextResponse.json({ success: false, message: authError }, { status: 401 });
    }
    const supabase = createServiceSupabase();
    const { error } = await supabase.auth.admin.signOut(token);

    if (error) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Đã đăng xuất' },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
