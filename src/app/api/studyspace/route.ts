import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role key for server-side operations (bypasses RLS)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { userId, name, theme, icon, goal } = await request.json();

    console.log('Creating study space for user:', userId);

    if (!userId || !name) {
      return NextResponse.json(
        { success: false, error: 'User ID và tên không gian là bắt buộc' },
        { status: 400 }
      );
    }

    // Check if user already has a study space
    const { data: existingSpace } = await supabase
      .from('study_spaces')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (existingSpace) {
      // Update existing study space
      const { error: updateError } = await supabase
        .from('study_spaces')
        .update({
          name,
          theme,
          icon,
          goal,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        return NextResponse.json(
          { success: false, error: updateError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, updated: true });
    }

    // Create new study space
    const { error: insertError } = await supabase
      .from('study_spaces')
      .insert({
        user_id: userId,
        name,
        theme,
        icon,
        goal,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json(
        { success: false, error: insertError.message, details: insertError },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, created: true });
  } catch (error) {
    console.error('Study space error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi tạo không gian học tập' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID là bắt buộc' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('study_spaces')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, studySpace: data });
  } catch (error) {
    console.error('Get study space error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi lấy không gian học tập' },
      { status: 500 }
    );
  }
}
