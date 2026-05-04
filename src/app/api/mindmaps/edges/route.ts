import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Add edges to mind map
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, mindMapId, edges } = body;

    if (!userId || !mindMapId || !edges || !Array.isArray(edges)) {
      return NextResponse.json(
        { success: false, error: 'User ID, mind map ID, và edges là bắt buộc' },
        { status: 400 }
      );
    }

    // Verify user owns the mind map
    const { data: mindMap, error: mapError } = await supabase
      .from('mind_maps')
      .select('id')
      .eq('id', mindMapId)
      .eq('user_id', userId)
      .single();

    if (mapError || !mindMap) {
      return NextResponse.json(
        { success: false, error: 'Mind map không tồn tại hoặc không có quyền' },
        { status: 403 }
      );
    }

    // Add mind_map_id to each edge
    const edgesToInsert = edges.map((edge: any) => ({
      ...edge,
      mind_map_id: mindMapId,
      created_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('mind_map_edges')
      .insert(edgesToInsert)
      .select();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, edges: data });
  } catch (error) {
    console.error('Edges POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi thêm edges' },
      { status: 500 }
    );
  }
}

// DELETE - Delete edge
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const edgeId = searchParams.get('edgeId');
    const userId = searchParams.get('userId');

    if (!edgeId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Edge ID và user ID là bắt buộc' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('mind_map_edges')
      .delete()
      .eq('id', edgeId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Edge đã được xóa' });
  } catch (error) {
    console.error('Edges DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xóa edge' },
      { status: 500 }
    );
  }
}
