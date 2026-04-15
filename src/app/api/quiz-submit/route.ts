import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { checkAuth, getAuthedClient } from '@/lib/auth-api';

export async function POST(request: NextRequest) {
  try {
    const { user, token, error: authError } = await checkAuth(request);
    if (!user || !token) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 });
    }
    const client = getAuthedClient(token);
    const { quizId, score, answers, topic } = await request.json();

    if (score === undefined) {
      return NextResponse.json(
        { error: 'Score is required' },
        { status: 400 }
      );
    }

    // Create quiz submission record
    const { error } = await client.from('quiz_submissions').insert([
      {
        user_id: user.id,
        quiz_id: quizId,
        topic: topic,
        score: score,
        answers: answers,
        submitted_at: new Date().toISOString(),
      },
    ]);

    if (error) {
      console.error('Quiz submission error:', error);
      return NextResponse.json(
        { error: 'Không thể lưu kết quả bài thi' },
        { status: 500 }
      );
    }

    // Update user stats
    try {
      const { data: userData } = await client
        .from('users')
        .select('total_quizzes_taken')
        .eq('id', user.id)
        .single();

      if (userData) {
        await client
          .from('users')
          .update({ total_quizzes_taken: (userData.total_quizzes_taken || 0) + 1 })
          .eq('id', user.id);
      }
    } catch (statError) {
      console.error('Stats update error:', statError);
    }

    return NextResponse.json({
      success: true,
      message: 'Kết quả bài thi đã được lưu',
    });
  } catch (error) {
    console.error('Quiz submit API error:', error);
    return NextResponse.json(
      { error: 'Lỗi khi xử lý bài thi' },
      { status: 500 }
    );
  }
}
