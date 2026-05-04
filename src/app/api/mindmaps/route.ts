import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch mind maps with nodes and edges
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const mindMapId = searchParams.get('mindMapId');
    const studySpaceId = searchParams.get('studySpaceId');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID là bắt buộc' },
        { status: 400 }
      );
    }

    // Get specific mind map with full details
    if (mindMapId) {
      const { data: mindMap, error: mapError } = await supabase
        .from('mind_maps')
        .select('*')
        .eq('id', mindMapId)
        .or(`user_id.eq.${userId},is_public.eq.true`)
        .single();

      if (mapError || !mindMap) {
        return NextResponse.json(
          { success: false, error: 'Mind map không tồn tại' },
          { status: 404 }
        );
      }

      // Get nodes
      const { data: nodes, error: nodesError } = await supabase
        .from('mind_map_nodes')
        .select('*')
        .eq('mind_map_id', mindMapId)
        .order('created_at', { ascending: true });

      if (nodesError) {
        return NextResponse.json(
          { success: false, error: nodesError.message },
          { status: 500 }
        );
      }

      // Get edges
      const { data: edges, error: edgesError } = await supabase
        .from('mind_map_edges')
        .select('*')
        .eq('mind_map_id', mindMapId);

      if (edgesError) {
        return NextResponse.json(
          { success: false, error: edgesError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        mindMap: {
          ...mindMap,
          nodes: nodes || [],
          edges: edges || [],
        },
      });
    }

    // Get list of mind maps
    let query = supabase
      .from('mind_maps')
      .select('*')
      .or(`user_id.eq.${userId},is_public.eq.true`)
      .order('updated_at', { ascending: false });

    if (studySpaceId) {
      query = query.eq('study_space_id', studySpaceId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, mindMaps: data });
  } catch (error) {
    console.error('Mind maps GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi lấy mind maps' },
      { status: 500 }
    );
  }
}

// POST - Create new mind map
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      studySpaceId,
      title,
      description,
      topic,
      layoutType = 'radial',
      nodes,
      edges,
    } = body;

    if (!userId || !title) {
      return NextResponse.json(
        { success: false, error: 'User ID và title là bắt buộc' },
        { status: 400 }
      );
    }

    // Create mind map
    const { data: mindMap, error: mapError } = await supabase
      .from('mind_maps')
      .insert({
        user_id: userId,
        study_space_id: studySpaceId,
        title,
        description,
        topic,
        layout_type: layoutType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (mapError) {
      return NextResponse.json(
        { success: false, error: mapError.message },
        { status: 500 }
      );
    }

    // Create root node if nodes provided
    if (nodes && nodes.length > 0) {
      const nodesWithMapId = nodes.map((node: any) => ({
        ...node,
        mind_map_id: mindMap.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data: createdNodes, error: nodesError } = await supabase
        .from('mind_map_nodes')
        .insert(nodesWithMapId)
        .select();

      if (nodesError) {
        console.error('Nodes insert error:', nodesError);
      }

      // Find root node
      const rootNode = createdNodes?.find((n: any) => n.node_type === 'root');
      if (rootNode) {
        await supabase
          .from('mind_maps')
          .update({ root_node_id: rootNode.id })
          .eq('id', mindMap.id);
      }

      // Create edges if provided
      if (edges && edges.length > 0 && createdNodes) {
        const nodeIdMap = new Map();
        createdNodes.forEach((node: any, index: number) => {
          if (nodes[index]) {
            nodeIdMap.set(nodes[index].id || index, node.id);
          }
        });

        const edgesWithMapId = edges.map((edge: any) => ({
          mind_map_id: mindMap.id,
          source_node_id: nodeIdMap.get(edge.source_node_id) || edge.source_node_id,
          target_node_id: nodeIdMap.get(edge.target_node_id) || edge.target_node_id,
          label: edge.label,
          line_style: edge.line_style || 'solid',
          color: edge.color || '#94a3b8',
          created_at: new Date().toISOString(),
        }));

        const { error: edgesError } = await supabase
          .from('mind_map_edges')
          .insert(edgesWithMapId);

        if (edgesError) {
          console.error('Edges insert error:', edgesError);
        }
      }
    }

    return NextResponse.json({
      success: true,
      mindMap,
      message: 'Mind map đã được tạo thành công',
    });
  } catch (error) {
    console.error('Mind maps POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi tạo mind map' },
      { status: 500 }
    );
  }
}

// PUT - Update mind map
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { mindMapId, userId, updates } = body;

    if (!mindMapId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Mind map ID và user ID là bắt buộc' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('mind_maps')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mindMapId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, mindMap: data });
  } catch (error) {
    console.error('Mind maps PUT error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi cập nhật mind map' },
      { status: 500 }
    );
  }
}

// DELETE - Delete mind map
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const mindMapId = searchParams.get('mindMapId');
    const userId = searchParams.get('userId');

    if (!mindMapId || !userId) {
      return NextResponse.json(
        { success: false, error: 'Mind map ID và user ID là bắt buộc' },
        { status: 400 }
      );
    }

    // Delete mind map (cascade will delete nodes and edges)
    const { error } = await supabase
      .from('mind_maps')
      .delete()
      .eq('id', mindMapId)
      .eq('user_id', userId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Mind map đã được xóa',
    });
  } catch (error) {
    console.error('Mind maps DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xóa mind map' },
      { status: 500 }
    );
  }
}
