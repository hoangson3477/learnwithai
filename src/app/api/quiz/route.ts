import { NextResponse } from 'next/server';
import supabase from '@/lib/db/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const difficulty = searchParams.get('difficulty');

    let query = supabase
      .from('quizzes')
      .select('*')
      .limit(20);

    if (topic) {
      query = query.eq('topic', topic);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    const { data: quizzes, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      quizzes: quizzes || [],
      count: quizzes?.length || 0,
    });
  } catch (error) {
    console.error('Quiz fetch error:', error);
    return NextResponse.json(
      { error: 'Không thể lấy danh sách bài thi' },
      { status: 500 }
    );
  }
}
