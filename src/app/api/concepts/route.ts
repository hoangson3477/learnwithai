import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET - Fetch concepts for a lesson
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId');
    const userId = searchParams.get('userId');

    if (!lessonId) {
      return NextResponse.json(
        { success: false, error: 'Lesson ID là bắt buộc' },
        { status: 400 }
      );
    }

    // Get concepts for lesson
    const { data: concepts, error: conceptsError } = await supabase
      .from('concepts')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('order_index', { ascending: true });

    if (conceptsError) {
      return NextResponse.json(
        { success: false, error: conceptsError.message },
        { status: 500 }
      );
    }

    // If userId provided, get user's progress on these concepts
    let userProgress: any[] = [];
    if (userId && concepts) {
      const conceptIds = concepts.map(c => c.id);
      const { data: progress, error: progressError } = await supabase
        .from('user_concept_progress')
        .select('*')
        .eq('user_id', userId)
        .in('concept_id', conceptIds);

      if (!progressError && progress) {
        userProgress = progress;
      }
    }

    // Merge concepts with user progress
    const conceptsWithProgress = concepts?.map(concept => {
      const progress = userProgress.find(p => p.concept_id === concept.id);
      return {
        ...concept,
        userProgress: progress || {
          status: 'not_started',
          time_spent: 0,
          notes: null,
          flashcards_created: 0,
        },
      };
    });

    return NextResponse.json({
      success: true,
      concepts: conceptsWithProgress,
    });
  } catch (error) {
    console.error('Concepts GET error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi lấy concepts' },
      { status: 500 }
    );
  }
}

// POST - Create new concept (admin only) or update user progress
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, userId, conceptId, lessonId, updates } = body;

    // Update user progress
    if (action === 'updateProgress') {
      if (!userId || !conceptId) {
        return NextResponse.json(
          { success: false, error: 'User ID và concept ID là bắt buộc' },
          { status: 400 }
        );
      }

      const { data: existing } = await supabase
        .from('user_concept_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('concept_id', conceptId)
        .single();

      let result;
      if (existing) {
        // Update existing
        const { data, error } = await supabase
          .from('user_concept_progress')
          .update({
            ...updates,
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        result = { data, error };
      } else {
        // Create new
        const { data, error } = await supabase
          .from('user_concept_progress')
          .insert({
            user_id: userId,
            concept_id: conceptId,
            lesson_id: lessonId,
            ...updates,
            last_accessed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        result = { data, error };
      }

      if (result.error) {
        return NextResponse.json(
          { success: false, error: result.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        progress: result.data,
      });
    }

    // Mark concept as completed
    if (action === 'complete') {
      if (!userId || !conceptId) {
        return NextResponse.json(
          { success: false, error: 'User ID và concept ID là bắt buộc' },
          { status: 400 }
        );
      }

      const { data: existing } = await supabase
        .from('user_concept_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('concept_id', conceptId)
        .single();

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from('user_concept_progress')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString(),
          })
          .eq('id', existing.id)
          .select()
          .single();
        result = { data, error };
      } else {
        const { data, error } = await supabase
          .from('user_concept_progress')
          .insert({
            user_id: userId,
            concept_id: conceptId,
            lesson_id: lessonId,
            status: 'completed',
            completed_at: new Date().toISOString(),
            last_accessed_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
        result = { data, error };
      }

      if (result.error) {
        return NextResponse.json(
          { success: false, error: result.error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        progress: result.data,
        message: 'Concept đã được đánh dấu hoàn thành',
      });
    }

    // Create flashcards from concept
    if (action === 'createFlashcards') {
      if (!userId || !conceptId) {
        return NextResponse.json(
          { success: false, error: 'User ID và concept ID là bắt buộc' },
          { status: 400 }
        );
      }

      // Get concept details
      const { data: concept, error: conceptError } = await supabase
        .from('concepts')
        .select('*')
        .eq('id', conceptId)
        .single();

      if (conceptError || !concept) {
        return NextResponse.json(
          { success: false, error: 'Concept không tồn tại' },
          { status: 404 }
        );
      }

      // Create flashcards from key points
      const flashcards = [];
      for (const point of concept.key_points || []) {
        const { data: flashcard, error } = await supabase
          .from('flashcards')
          .insert({
            user_id: userId,
            lesson_id: lessonId,
            concept: concept.title,
            front: point,
            back: concept.description,
            tags: [concept.title, 'auto-generated'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!error && flashcard) {
          flashcards.push(flashcard);
        }
      }

      // Update flashcards_created count
      await supabase
        .from('user_concept_progress')
        .upsert({
          user_id: userId,
          concept_id: conceptId,
          lesson_id: lessonId,
          flashcards_created: flashcards.length,
          last_accessed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,concept_id' });

      return NextResponse.json({
        success: true,
        flashcards,
        count: flashcards.length,
        message: `Đã tạo ${flashcards.length} flashcards từ concept`,
      });
    }

    // Default: Create new concept (admin)
    const { lessonId: newLessonId, title, description, keyPoints, examples } = body;

    const { data, error } = await supabase
      .from('concepts')
      .insert({
        lesson_id: newLessonId,
        title,
        description,
        key_points: keyPoints || [],
        examples: examples || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      concept: data,
    });
  } catch (error) {
    console.error('Concepts POST error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi xử lý concept' },
      { status: 500 }
    );
  }
}

// GET user concept stats
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, lessonId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID là bắt buộc' },
        { status: 400 }
      );
    }

    let query = supabase
      .from('user_concept_progress')
      .select('*, concepts!inner(*)')
      .eq('user_id', userId);

    if (lessonId) {
      query = query.eq('lesson_id', lessonId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    const stats = {
      total: data?.length || 0,
      completed: data?.filter((d: any) => d.status === 'completed').length || 0,
      inProgress: data?.filter((d: any) => d.status === 'in_progress').length || 0,
      notStarted: data?.filter((d: any) => d.status === 'not_started').length || 0,
      totalTimeSpent: data?.reduce((sum: number, d: any) => sum + (d.time_spent || 0), 0) || 0,
      totalFlashcards: data?.reduce((sum: number, d: any) => sum + (d.flashcards_created || 0), 0) || 0,
    };

    return NextResponse.json({
      success: true,
      stats,
      progress: data,
    });
  } catch (error) {
    console.error('Concept stats error:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi lấy stats' },
      { status: 500 }
    );
  }
}
