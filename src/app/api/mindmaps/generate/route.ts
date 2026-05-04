import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST - Auto-generate mind map from flashcards
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, studySpaceId, topic, concept } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID là bắt buộc' },
        { status: 400 }
      );
    }

    // Get flashcards for the user/topic
    let flashcardQuery = supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId);

    if (topic) {
      flashcardQuery = flashcardQuery.or(`concept.ilike.%${topic}%,tags.cs.{${topic}}`);
    }

    if (concept) {
      flashcardQuery = flashcardQuery.eq('concept', concept);
    }

    const { data: flashcards, error: flashcardError } = await flashcardQuery.limit(20);

    if (flashcardError) {
      return NextResponse.json(
        { success: false, error: flashcardError.message },
        { status: 500 }
      );
    }

    if (!flashcards || flashcards.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Không tìm thấy flashcards để tạo mind map' },
        { status: 404 }
      );
    }

    // Get concepts from flashcards
    const concepts = [...new Set(flashcards.map(f => f.concept))];
    const mainConcept = concept || concepts[0] || topic || 'Chủ đề chính';

    // Create mind map
    const { data: mindMap, error: mapError } = await supabase
      .from('mind_maps')
      .insert({
        user_id: userId,
        study_space_id: studySpaceId,
        title: `Mind Map: ${mainConcept}`,
        description: `Mind map tự động tạo từ ${flashcards.length} flashcards`,
        topic: mainConcept,
        layout_type: 'radial',
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

    // Create root node at center
    const rootX = 400;
    const rootY = 300;
    const { data: rootNode, error: rootError } = await supabase
      .from('mind_map_nodes')
      .insert({
        mind_map_id: mindMap.id,
        concept: mainConcept,
        content: `Chủ đề chính: ${mainConcept}`,
        node_type: 'root',
        x_position: rootX,
        y_position: rootY,
        color: '#6366f1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (rootError) {
      return NextResponse.json(
        { success: false, error: rootError.message },
        { status: 500 }
      );
    }

    // Update mind map with root node
    await supabase
      .from('mind_maps')
      .update({ root_node_id: rootNode.id })
      .eq('id', mindMap.id);

    // Create concept nodes (one per unique concept)
    const conceptNodes: any[] = [];
    const uniqueConcepts = [...new Set(flashcards.map(f => f.concept))];
    const radius = 200;
    const angleStep = (2 * Math.PI) / uniqueConcepts.length;

    for (let i = 0; i < uniqueConcepts.length; i++) {
      const angle = i * angleStep - Math.PI / 2; // Start from top
      const x = rootX + radius * Math.cos(angle);
      const y = rootY + radius * Math.sin(angle);

      const { data: node, error } = await supabase
        .from('mind_map_nodes')
        .insert({
          mind_map_id: mindMap.id,
          concept: uniqueConcepts[i],
          content: `Concept: ${uniqueConcepts[i]}`,
          node_type: 'concept',
          x_position: x,
          y_position: y,
          color: '#8b5cf6',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!error && node) {
        conceptNodes.push(node);

        // Create edge from root to concept
        await supabase
          .from('mind_map_edges')
          .insert({
            mind_map_id: mindMap.id,
            source_node_id: rootNode.id,
            target_node_id: node.id,
            color: '#94a3b8',
            created_at: new Date().toISOString(),
          });
      }
    }

    // Create subconcept nodes from flashcards
    const subRadius = 120;
    for (const conceptNode of conceptNodes) {
      const relatedFlashcards = flashcards.filter(f => f.concept === conceptNode.concept);
      const subAngleStep = (Math.PI / 2) / (relatedFlashcards.length + 1);
      const baseAngle = Math.atan2(
        conceptNode.y_position - rootY,
        conceptNode.x_position - rootX
      );

      for (let i = 0; i < relatedFlashcards.length; i++) {
        const flashcard = relatedFlashcards[i];
        const subAngle = baseAngle + (i - relatedFlashcards.length / 2) * 0.3;
        const x = conceptNode.x_position + subRadius * Math.cos(subAngle);
        const y = conceptNode.y_position + subRadius * Math.sin(subAngle);

        const { data: subNode, error } = await supabase
          .from('mind_map_nodes')
          .insert({
            mind_map_id: mindMap.id,
            concept: flashcard.front.substring(0, 30) + '...',
            content: `${flashcard.front}\n\n${flashcard.back}`,
            node_type: 'subconcept',
            x_position: x,
            y_position: y,
            color: '#a78bfa',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && subNode) {
          // Create edge from concept to subconcept
          await supabase
            .from('mind_map_edges')
            .insert({
              mind_map_id: mindMap.id,
              source_node_id: conceptNode.id,
              target_node_id: subNode.id,
              line_style: 'dashed',
              color: '#cbd5e1',
              created_at: new Date().toISOString(),
            });
        }
      }
    }

    // Fetch complete mind map
    const { data: completeMindMap } = await supabase
      .from('mind_maps')
      .select('*')
      .eq('id', mindMap.id)
      .single();

    const { data: nodes } = await supabase
      .from('mind_map_nodes')
      .select('*')
      .eq('mind_map_id', mindMap.id);

    const { data: edges } = await supabase
      .from('mind_map_edges')
      .select('*')
      .eq('mind_map_id', mindMap.id);

    return NextResponse.json({
      success: true,
      mindMap: {
        ...completeMindMap,
        nodes: nodes || [],
        edges: edges || [],
      },
      message: `Mind map đã được tạo với ${nodes?.length || 0} nodes và ${edges?.length || 0} connections`,
    });
  } catch (error) {
    console.error('Generate mind map error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi tạo mind map tự động' },
      { status: 500 }
    );
  }
}
