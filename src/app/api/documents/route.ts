import { NextResponse } from 'next/server';
import supabase from '@/lib/db/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get('topic');
    const search = searchParams.get('search');

    let query = supabase
      .from('documents')
      .select('*, author:users(name, avatar)')
      .order('created_at', { ascending: false })
      .limit(20);

    if (topic) {
      query = query.eq('topic', topic);
    }

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%,content.ilike.%${search}%`
      );
    }

    const { data: documents, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
      count: documents?.length || 0,
    });
  } catch (error) {
    console.error('Document fetch error:', error);
    return NextResponse.json(
      { error: 'Không thể lấy danh sách tài liệu' },
      { status: 500 }
    );
  }
}
