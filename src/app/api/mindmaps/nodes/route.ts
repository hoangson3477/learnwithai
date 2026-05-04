import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Add nodes to mind map
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, mindMapId, nodes } = body;

    if (!userId || !mindMapId || !nodes || !Array.isArray(nodes)) {
      return NextResponse.json(
        { success: false, error: 'User ID, mind map ID, và nodes là bắt buộc' },
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

    // Add mind_map_id to each node
    const nodesToInsert = nodes.map((node: any) => ({
      ...node,
      mind_map_id: mindMapId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from('mind_map_nodes')
      .insert(nodesToInsert)
      .select();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, nodes: data });
  } catch (error) {
    console.error('Nodes POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi thêm nodes' },
      { status: 500 }
    );
  }
}

// PUT - Update node
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, nodeId, updates } = body;

    if (!userId || !nodeId) {
      return NextResponse.json(
        { success: false, error: 'User ID và node ID là bắt buộc' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('mind_map_nodes')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', nodeId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, node: data });
  } catch (error) {
    console.error('Nodes PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi cập nhật node' },
      { status: 500 }
    );
  }
}

// DELETE - Delete node
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nodeId = searchParams.get('nodeId');
    const userId = searchParams.get('userId');

    if (!nodeId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Node ID và user ID là bắt buộc' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('mind_map_nodes')
      .delete()
      .eq('id', nodeId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Node đã được xóa' });
  } catch (error) {
    console.error('Nodes DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xóa node' },
      { status: 500 }
    );
  }
}
