import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client for server-side operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, message: 'Email, mật khẩu và tên là bắt buộc' },
        { status: 400 }
      );
    }

    // Sign up user using admin client
    const { error: signUpError, data } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
    });

    if (signUpError) {
      return NextResponse.json(
        { success: false, message: signUpError.message },
        { status: 400 }
      );
    }

    // Create user profile using admin client
    if (data.user) {
      const { error: profileError } = await supabaseAdmin.from('users').insert([
        {
          id: data.user.id,
          email,
          name,
        },
      ]);

      if (profileError) {
        return NextResponse.json(
          { success: false, message: profileError.message },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { success: true, message: 'Đăng ký thành công', user: data.user },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, message: 'Lỗi server' },
      { status: 500 }
    );
  }
}
